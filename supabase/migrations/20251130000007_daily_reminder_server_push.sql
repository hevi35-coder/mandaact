-- =====================================================
-- Daily Reminder Server Push Migration
-- Created: 2025-11-30
-- Purpose: Convert daily_reminder from local notification to server push
--          - Add notification_settings table for user preferences
--          - Create SQL function to process daily reminders
--          - Setup pg_cron jobs for hourly processing
-- =====================================================

-- =====================================================
-- 1. Notification Settings Table
-- Stores user preferences for notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- 실천 리마인더 설정
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_hour INTEGER NOT NULL DEFAULT 20 CHECK (reminder_hour >= 0 AND reminder_hour <= 23),
  reminder_minute INTEGER NOT NULL DEFAULT 0 CHECK (reminder_minute >= 0 AND reminder_minute <= 59),

  -- 맞춤 메시지 설정
  custom_message_enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cron job queries
CREATE INDEX IF NOT EXISTS idx_notification_settings_reminder
  ON notification_settings(reminder_enabled, reminder_hour, reminder_minute)
  WHERE reminder_enabled = true;

-- RLS Policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on notification_settings"
  ON notification_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- =====================================================
-- 2. Function to get users for daily reminder
-- Returns users whose reminder time matches current hour
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_for_daily_reminder(p_hour INTEGER)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  push_token TEXT,
  today_done BIGINT,
  today_total BIGINT,
  current_streak INTEGER,
  remaining_action_name TEXT
) AS $$
DECLARE
  v_today DATE;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
  v_day_start := v_today::TIMESTAMPTZ AT TIME ZONE 'Asia/Seoul';
  v_day_end := (v_today + INTERVAL '1 day')::TIMESTAMPTZ AT TIME ZONE 'Asia/Seoul';

  RETURN QUERY
  WITH user_actions AS (
    -- Get total checkable actions per user (exclude reference type)
    SELECT
      m.user_id,
      COUNT(a.id) as total_actions,
      -- Get first unchecked action name for personalization
      (
        SELECT a2.title
        FROM actions a2
        INNER JOIN sub_goals sg2 ON sg2.id = a2.sub_goal_id
        INNER JOIN mandalarts m2 ON m2.id = sg2.mandalart_id
        WHERE m2.user_id = m.user_id
          AND m2.is_active = true
          AND a2.type != 'reference'
          AND NOT EXISTS (
            SELECT 1 FROM check_history ch
            WHERE ch.action_id = a2.id
              AND ch.checked_at >= v_day_start
              AND ch.checked_at < v_day_end
          )
        LIMIT 1
      ) as first_unchecked_action
    FROM mandalarts m
    INNER JOIN sub_goals sg ON sg.mandalart_id = m.id
    INNER JOIN actions a ON a.sub_goal_id = sg.id
    WHERE m.is_active = true AND a.type != 'reference'
    GROUP BY m.user_id
  ),
  user_checks AS (
    -- Get today's check count per user
    SELECT
      ch.user_id,
      COUNT(ch.id) as checked_count
    FROM check_history ch
    WHERE ch.checked_at >= v_day_start
      AND ch.checked_at < v_day_end
    GROUP BY ch.user_id
  )
  SELECT
    ns.user_id,
    COALESCE(ul.nickname, split_part(u.email, '@', 1), '회원')::TEXT as nickname,
    pt.token as push_token,
    COALESCE(uc.checked_count, 0) as today_done,
    COALESCE(ua.total_actions, 0) as today_total,
    COALESCE(ul.current_streak, 0)::INTEGER as current_streak,
    ua.first_unchecked_action as remaining_action_name
  FROM notification_settings ns
  INNER JOIN auth.users u ON u.id = ns.user_id
  INNER JOIN push_tokens pt ON pt.user_id = ns.user_id AND pt.is_active = true
  LEFT JOIN user_levels ul ON ul.user_id = ns.user_id
  LEFT JOIN user_actions ua ON ua.user_id = ns.user_id
  LEFT JOIN user_checks uc ON uc.user_id = ns.user_id
  WHERE ns.reminder_enabled = true
    AND ns.reminder_hour = p_hour
    -- Only send if user has actions to check
    AND COALESCE(ua.total_actions, 0) > 0
    -- Check daily reminder hasn't been sent today
    AND NOT EXISTS (
      SELECT 1 FROM notification_history nh
      WHERE nh.user_id = ns.user_id
        AND nh.notification_type = 'daily_reminder'
        AND nh.sent_date = v_today
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Process Daily Reminder Notifications
-- Called by pg_cron every hour
-- =====================================================

CREATE OR REPLACE FUNCTION process_daily_reminder_notifications(p_hour INTEGER)
RETURNS TABLE (
  users_processed INTEGER,
  notifications_sent INTEGER,
  errors_count INTEGER
) AS $$
DECLARE
  v_users_processed INTEGER := 0;
  v_notifications_sent INTEGER := 0;
  v_errors_count INTEGER := 0;
  v_user RECORD;
  v_title TEXT;
  v_body TEXT;
  v_sent BOOLEAN;
  v_remaining INTEGER;
BEGIN
  RAISE NOTICE 'Starting daily reminder processing for hour: % KST', p_hour;

  FOR v_user IN
    SELECT * FROM get_users_for_daily_reminder(p_hour)
  LOOP
    v_users_processed := v_users_processed + 1;

    BEGIN
      v_remaining := v_user.today_total - v_user.today_done;

      -- Build personalized message based on context
      -- Priority: Streak message > Completion status > Default
      IF v_user.current_streak > 0 AND v_user.today_done = 0 THEN
        -- Has streak but no practice today
        v_title := v_user.nickname || '님, ' || v_user.current_streak || '일째 실천 중! 🔥';
        v_body := '오늘도 이어가면 ' || (v_user.current_streak + 1) || '일 달성!';
      ELSIF v_user.today_done = 0 THEN
        -- No practice today
        IF v_user.remaining_action_name IS NOT NULL THEN
          v_title := v_user.nickname || '님, 아직 ' || v_user.today_total || '개 남았어요!';
          v_body := v_user.remaining_action_name || ' 지금 완료해볼까요?';
        ELSE
          v_title := v_user.nickname || '님, 오늘의 실천을 시작해볼까요? 💪';
          v_body := v_user.today_total || '개의 실천이 기다리고 있어요.';
        END IF;
      ELSIF v_user.today_done > 0 AND v_remaining > 0 THEN
        -- Some practice done
        v_title := v_user.nickname || '님, 오늘 ' || v_user.today_done || '/' || v_user.today_total || ' 완료! 💪';
        v_body := v_remaining || '개만 더 하면 목표 달성이에요.';
      ELSIF v_remaining = 0 THEN
        -- All done today - still send encouragement
        v_title := v_user.nickname || '님, 오늘도 완벽해요! 🎉';
        v_body := '내일도 이 컨디션 유지해봐요.';
      ELSE
        -- Default fallback
        v_title := v_user.nickname || '님, 오늘의 실천을 완료하세요! 💪';
        v_body := '아직 완료하지 않은 실천이 있어요.';
      END IF;

      -- Send push notification
      v_sent := send_expo_push_notification(
        v_user.push_token,
        v_title,
        v_body,
        jsonb_build_object(
          'type', 'daily_reminder',
          'today_done', v_user.today_done,
          'today_total', v_user.today_total,
          'streak', v_user.current_streak
        )
      );

      IF v_sent THEN
        -- Record notification sent
        PERFORM record_notification_sent(
          v_user.user_id,
          'daily_reminder',
          jsonb_build_object(
            'hour', p_hour,
            'today_done', v_user.today_done,
            'today_total', v_user.today_total
          )
        );
        v_notifications_sent := v_notifications_sent + 1;
        RAISE NOTICE 'Daily reminder sent to user: % at hour %', v_user.user_id, p_hour;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors_count := v_errors_count + 1;
      RAISE WARNING 'Error processing daily reminder for user %: %', v_user.user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Daily reminder completed for hour %: users=%, sent=%, errors=%',
    p_hour, v_users_processed, v_notifications_sent, v_errors_count;

  RETURN QUERY SELECT v_users_processed, v_notifications_sent, v_errors_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. pg_cron Jobs - Run every hour
-- Each job targets a specific KST hour
-- =====================================================

-- UTC to KST mapping: KST = UTC + 9
-- Schedule for each possible reminder hour (we'll schedule common hours)
-- Users can set 0-23, but most will use evening hours (18-22)

-- Process users who set reminder for each hour
-- Running at :00 of each UTC hour, checking the corresponding KST hour

-- KST 18:00 = UTC 09:00
SELECT cron.schedule(
  'daily-reminder-18',
  '0 9 * * *',
  $$SELECT process_daily_reminder_notifications(18)$$
);

-- KST 19:00 = UTC 10:00
SELECT cron.schedule(
  'daily-reminder-19',
  '0 10 * * *',
  $$SELECT process_daily_reminder_notifications(19)$$
);

-- KST 20:00 = UTC 11:00 (default)
SELECT cron.schedule(
  'daily-reminder-20',
  '0 11 * * *',
  $$SELECT process_daily_reminder_notifications(20)$$
);

-- KST 21:00 = UTC 12:00
SELECT cron.schedule(
  'daily-reminder-21',
  '0 12 * * *',
  $$SELECT process_daily_reminder_notifications(21)$$
);

-- KST 22:00 = UTC 13:00
SELECT cron.schedule(
  'daily-reminder-22',
  '0 13 * * *',
  $$SELECT process_daily_reminder_notifications(22)$$
);

-- For other hours, we can add a catch-all that runs every hour
-- This handles users who set unusual reminder times
SELECT cron.schedule(
  'daily-reminder-hourly',
  '0 * * * *',
  $$
  DO $body$
  DECLARE
    v_kst_hour INTEGER;
  BEGIN
    -- Calculate current KST hour
    v_kst_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Seoul')::INTEGER;

    -- Skip hours that have dedicated jobs (18-22)
    IF v_kst_hour NOT IN (18, 19, 20, 21, 22) THEN
      PERFORM process_daily_reminder_notifications(v_kst_hour);
    END IF;
  END $body$;
  $$
);

-- =====================================================
-- 5. Comments
-- =====================================================

COMMENT ON TABLE notification_settings IS 'User notification preferences for daily reminder and custom messages';
COMMENT ON FUNCTION get_users_for_daily_reminder(INTEGER) IS 'Returns users eligible for daily reminder at specified KST hour';
COMMENT ON FUNCTION process_daily_reminder_notifications(INTEGER) IS 'Process and send daily reminder notifications for specified KST hour';

-- =====================================================
-- 6. Grant permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON notification_settings TO authenticated;
GRANT ALL ON notification_settings TO service_role;
GRANT EXECUTE ON FUNCTION get_users_for_daily_reminder(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION process_daily_reminder_notifications(INTEGER) TO service_role;
