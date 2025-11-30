-- =====================================================
-- Timezone-Aware Notification System
-- Created: 2025-11-30
-- Purpose: Update notification functions to use user's timezone
--          - Daily reminder: send at user's local time
--          - Streak warning: calculate "today" based on user timezone
--          - Comeback notification: calculate days based on user timezone
--          - Weekly report: use user's local week boundaries
-- =====================================================

-- =====================================================
-- 0. Drop existing functions to change return types
-- =====================================================

DROP FUNCTION IF EXISTS get_users_for_daily_reminder(INTEGER);
DROP FUNCTION IF EXISTS get_users_for_streak_warning();
DROP FUNCTION IF EXISTS get_users_for_comeback_notification(INTEGER);
DROP FUNCTION IF EXISTS process_daily_reminder_notifications(INTEGER);

-- =====================================================
-- 1. Update get_users_for_daily_reminder to use user timezone
-- Previously: Always used KST, so 20:00 KST for all users
-- Now: Matches user's reminder_hour with their local time
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_for_daily_reminder(p_utc_hour INTEGER)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  push_token TEXT,
  today_done BIGINT,
  today_total BIGINT,
  current_streak INTEGER,
  remaining_action_name TEXT,
  user_timezone TEXT,
  user_language TEXT
) AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- For each user, check if their local hour matches their reminder_hour
  FOR v_user IN
    SELECT
      ns.user_id,
      COALESCE(ul.nickname, split_part(u.email, '@', 1), '회원')::TEXT as nickname,
      pt.token as push_token,
      COALESCE(ul.timezone, 'Asia/Seoul')::TEXT as user_tz,
      COALESCE(ul.language, 'ko')::TEXT as user_lang,
      ns.reminder_hour
    FROM notification_settings ns
    INNER JOIN auth.users u ON u.id = ns.user_id
    INNER JOIN push_tokens pt ON pt.user_id = ns.user_id AND pt.is_active = true
    LEFT JOIN user_levels ul ON ul.user_id = ns.user_id
    WHERE ns.reminder_enabled = true
  LOOP
    -- Check if current UTC hour matches user's local reminder hour
    -- Example: If user in New York (UTC-5) sets 20:00 reminder
    -- When UTC is 01:00, New York is 20:00
    DECLARE
      v_user_local_hour INTEGER;
      v_user_today DATE;
      v_day_start TIMESTAMPTZ;
      v_day_end TIMESTAMPTZ;
      v_today_done BIGINT;
      v_today_total BIGINT;
      v_current_streak INTEGER;
      v_remaining_action TEXT;
    BEGIN
      -- Calculate user's current local hour
      v_user_local_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE v_user.user_tz)::INTEGER;

      -- Check if it matches their reminder hour
      IF v_user_local_hour = v_user.reminder_hour THEN
        -- Calculate user's "today" in their timezone
        v_user_today := (NOW() AT TIME ZONE v_user.user_tz)::DATE;
        v_day_start := v_user_today::TIMESTAMPTZ AT TIME ZONE v_user.user_tz;
        v_day_end := (v_user_today + INTERVAL '1 day')::TIMESTAMPTZ AT TIME ZONE v_user.user_tz;

        -- Get user's total checkable actions
        SELECT COUNT(a.id) INTO v_today_total
        FROM mandalarts m
        INNER JOIN sub_goals sg ON sg.mandalart_id = m.id
        INNER JOIN actions a ON a.sub_goal_id = sg.id
        WHERE m.user_id = v_user.user_id
          AND m.is_active = true
          AND a.type != 'reference';

        -- Skip if user has no actions
        IF COALESCE(v_today_total, 0) = 0 THEN
          CONTINUE;
        END IF;

        -- Get user's today checks count
        SELECT COUNT(ch.id) INTO v_today_done
        FROM check_history ch
        WHERE ch.user_id = v_user.user_id
          AND ch.checked_at >= v_day_start
          AND ch.checked_at < v_day_end;

        -- Get current streak
        SELECT COALESCE(current_streak, 0) INTO v_current_streak
        FROM user_levels
        WHERE user_id = v_user.user_id;

        -- Get first unchecked action name
        SELECT a.title INTO v_remaining_action
        FROM actions a
        INNER JOIN sub_goals sg ON sg.id = a.sub_goal_id
        INNER JOIN mandalarts m ON m.id = sg.mandalart_id
        WHERE m.user_id = v_user.user_id
          AND m.is_active = true
          AND a.type != 'reference'
          AND NOT EXISTS (
            SELECT 1 FROM check_history ch
            WHERE ch.action_id = a.id
              AND ch.checked_at >= v_day_start
              AND ch.checked_at < v_day_end
          )
        LIMIT 1;

        -- Check daily reminder hasn't been sent today (user's today)
        IF NOT EXISTS (
          SELECT 1 FROM notification_history nh
          WHERE nh.user_id = v_user.user_id
            AND nh.notification_type = 'daily_reminder'
            AND nh.sent_date = v_user_today
        ) THEN
          user_id := v_user.user_id;
          nickname := v_user.nickname;
          push_token := v_user.push_token;
          today_done := v_today_done;
          today_total := v_today_total;
          current_streak := v_current_streak;
          remaining_action_name := v_remaining_action;
          user_timezone := v_user.user_tz;
          user_language := v_user.user_lang;
          RETURN NEXT;
        END IF;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Update process_daily_reminder_notifications
-- Now runs every hour and checks each user's local time
-- =====================================================

DROP FUNCTION IF EXISTS process_daily_reminder_notifications(INTEGER);

CREATE OR REPLACE FUNCTION process_daily_reminder_notifications()
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
  v_utc_hour INTEGER;
BEGIN
  v_utc_hour := EXTRACT(HOUR FROM NOW())::INTEGER;
  RAISE NOTICE 'Starting daily reminder processing at UTC hour: %', v_utc_hour;

  FOR v_user IN
    SELECT * FROM get_users_for_daily_reminder(v_utc_hour)
  LOOP
    v_users_processed := v_users_processed + 1;

    BEGIN
      v_remaining := v_user.today_total - v_user.today_done;

      -- Build personalized message based on context and language
      IF v_user.user_language = 'en' THEN
        -- English messages
        IF v_user.current_streak > 0 AND v_user.today_done = 0 THEN
          v_title := v_user.nickname || ', ' || v_user.current_streak || ' day streak! 🔥';
          v_body := 'Keep going to reach ' || (v_user.current_streak + 1) || ' days!';
        ELSIF v_user.today_done = 0 THEN
          IF v_user.remaining_action_name IS NOT NULL THEN
            v_title := v_user.nickname || ', ' || v_user.today_total || ' items left!';
            v_body := 'Start with "' || v_user.remaining_action_name || '"?';
          ELSE
            v_title := v_user.nickname || ', ready to practice? 💪';
            v_body := v_user.today_total || ' items are waiting for you.';
          END IF;
        ELSIF v_user.today_done > 0 AND v_remaining > 0 THEN
          v_title := v_user.nickname || ', ' || v_user.today_done || '/' || v_user.today_total || ' done! 💪';
          v_body := 'Just ' || v_remaining || ' more to complete today.';
        ELSIF v_remaining = 0 THEN
          v_title := v_user.nickname || ', perfect day! 🎉';
          v_body := 'Keep this momentum tomorrow!';
        ELSE
          v_title := v_user.nickname || ', complete your practice! 💪';
          v_body := 'You have uncompleted items.';
        END IF;
      ELSE
        -- Korean messages (default)
        IF v_user.current_streak > 0 AND v_user.today_done = 0 THEN
          v_title := v_user.nickname || '님, ' || v_user.current_streak || '일째 실천 중! 🔥';
          v_body := '오늘도 이어가면 ' || (v_user.current_streak + 1) || '일 달성!';
        ELSIF v_user.today_done = 0 THEN
          IF v_user.remaining_action_name IS NOT NULL THEN
            v_title := v_user.nickname || '님, 아직 ' || v_user.today_total || '개 남았어요!';
            v_body := v_user.remaining_action_name || ' 지금 완료해볼까요?';
          ELSE
            v_title := v_user.nickname || '님, 오늘의 실천을 시작해볼까요? 💪';
            v_body := v_user.today_total || '개의 실천이 기다리고 있어요.';
          END IF;
        ELSIF v_user.today_done > 0 AND v_remaining > 0 THEN
          v_title := v_user.nickname || '님, 오늘 ' || v_user.today_done || '/' || v_user.today_total || ' 완료! 💪';
          v_body := v_remaining || '개만 더 하면 목표 달성이에요.';
        ELSIF v_remaining = 0 THEN
          v_title := v_user.nickname || '님, 오늘도 완벽해요! 🎉';
          v_body := '내일도 이 컨디션 유지해봐요.';
        ELSE
          v_title := v_user.nickname || '님, 오늘의 실천을 완료하세요! 💪';
          v_body := '아직 완료하지 않은 실천이 있어요.';
        END IF;
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
        -- Record notification sent using user's local date
        INSERT INTO notification_history (user_id, notification_type, sent_date, metadata)
        VALUES (
          v_user.user_id,
          'daily_reminder',
          (NOW() AT TIME ZONE v_user.user_timezone)::DATE,
          jsonb_build_object(
            'today_done', v_user.today_done,
            'today_total', v_user.today_total,
            'user_timezone', v_user.user_timezone
          )
        );
        v_notifications_sent := v_notifications_sent + 1;
        RAISE NOTICE 'Daily reminder sent to user: % (tz: %)', v_user.user_id, v_user.user_timezone;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors_count := v_errors_count + 1;
      RAISE WARNING 'Error processing daily reminder for user %: %', v_user.user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Daily reminder completed: users=%, sent=%, errors=%',
    v_users_processed, v_notifications_sent, v_errors_count;

  RETURN QUERY SELECT v_users_processed, v_notifications_sent, v_errors_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Update get_users_for_streak_warning to use user timezone
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_for_streak_warning()
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  email TEXT,
  push_token TEXT,
  current_streak INTEGER,
  user_timezone TEXT,
  user_language TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.user_id,
    COALESCE(ul.nickname, split_part(u.email, '@', 1))::TEXT as nickname,
    u.email::TEXT,
    pt.token as push_token,
    COALESCE(ul.current_streak, 0)::INTEGER as current_streak,
    COALESCE(ul.timezone, 'Asia/Seoul')::TEXT as user_timezone,
    COALESCE(ul.language, 'ko')::TEXT as user_language
  FROM user_levels ul
  INNER JOIN auth.users u ON u.id = ul.user_id
  INNER JOIN push_tokens pt ON pt.user_id = ul.user_id AND pt.is_active = true
  WHERE ul.current_streak >= 3
    -- Check user has 0 checks today in their timezone
    AND NOT EXISTS (
      SELECT 1 FROM check_history ch
      WHERE ch.user_id = ul.user_id
        AND DATE(ch.checked_at AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))
            = DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))
    )
    -- Check streak_warning hasn't been sent today (in user's timezone)
    AND NOT EXISTS (
      SELECT 1 FROM notification_history nh
      WHERE nh.user_id = ul.user_id
        AND nh.notification_type = 'streak_warning'
        AND nh.sent_date = DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Update process_streak_warning_notifications for i18n
-- =====================================================

CREATE OR REPLACE FUNCTION process_streak_warning_notifications()
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
BEGIN
  RAISE NOTICE 'Starting streak warning processing';

  FOR v_user IN
    SELECT * FROM get_users_for_streak_warning()
  LOOP
    v_users_processed := v_users_processed + 1;

    BEGIN
      -- Build personalized message based on streak length and language
      IF v_user.user_language = 'en' THEN
        -- English messages
        IF v_user.current_streak >= 30 THEN
          v_title := v_user.nickname || ', protect your 🏆 ' || v_user.current_streak || '-day record!';
          v_body := 'You''ve kept this streak for over a month.';
        ELSIF v_user.current_streak >= 7 THEN
          v_title := v_user.nickname || ', your ' || v_user.current_streak || '-day streak is at risk! 🔥';
          v_body := 'Miss today and it resets to zero.';
        ELSE
          v_title := v_user.nickname || ', keep your ' || v_user.current_streak || '-day streak! 🔥';
          v_body := 'Just complete 1 item before midnight.';
        END IF;
      ELSE
        -- Korean messages (default)
        IF v_user.current_streak >= 30 THEN
          v_title := v_user.nickname || '님, 🏆 ' || v_user.current_streak || '일 대기록을 지켜주세요!';
          v_body := '한 달 넘게 이어온 스트릭이에요.';
        ELSIF v_user.current_streak >= 7 THEN
          v_title := v_user.nickname || '님, ' || v_user.current_streak || '일 스트릭이 위험해요! 🔥';
          v_body := '오늘 놓치면 처음부터예요.';
        ELSE
          v_title := v_user.nickname || '님, ' || v_user.current_streak || '일 스트릭을 이어가세요! 🔥';
          v_body := '자정 전에 1개만 실천하면 유지돼요.';
        END IF;
      END IF;

      -- Send push notification
      v_sent := send_expo_push_notification(
        v_user.push_token,
        v_title,
        v_body,
        jsonb_build_object('type', 'streak_warning', 'streak', v_user.current_streak)
      );

      IF v_sent THEN
        -- Record notification sent using user's local date
        INSERT INTO notification_history (user_id, notification_type, sent_date, metadata)
        VALUES (
          v_user.user_id,
          'streak_warning',
          DATE(NOW() AT TIME ZONE v_user.user_timezone),
          jsonb_build_object('streak', v_user.current_streak, 'user_timezone', v_user.user_timezone)
        );
        v_notifications_sent := v_notifications_sent + 1;
        RAISE NOTICE 'Streak warning sent to user: % (streak: %, tz: %)', v_user.user_id, v_user.current_streak, v_user.user_timezone;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors_count := v_errors_count + 1;
      RAISE WARNING 'Error processing user %: %', v_user.user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Streak warning completed: users=%, sent=%, errors=%', v_users_processed, v_notifications_sent, v_errors_count;

  RETURN QUERY SELECT v_users_processed, v_notifications_sent, v_errors_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Update get_users_for_comeback_notification
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_for_comeback_notification(days_inactive INTEGER)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  email TEXT,
  push_token TEXT,
  last_check_date DATE,
  days_since_last_check INTEGER,
  user_timezone TEXT,
  user_language TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_checks AS (
    SELECT
      ch.user_id,
      MAX(DATE(ch.checked_at AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))) as last_check
    FROM check_history ch
    LEFT JOIN user_levels ul ON ul.user_id = ch.user_id
    GROUP BY ch.user_id
  )
  SELECT
    ul.user_id,
    COALESCE(ul.nickname, split_part(u.email, '@', 1))::TEXT as nickname,
    u.email::TEXT,
    pt.token as push_token,
    lc.last_check as last_check_date,
    (DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul')) - lc.last_check)::INTEGER as days_since,
    COALESCE(ul.timezone, 'Asia/Seoul')::TEXT as user_timezone,
    COALESCE(ul.language, 'ko')::TEXT as user_language
  FROM user_levels ul
  INNER JOIN auth.users u ON u.id = ul.user_id
  INNER JOIN push_tokens pt ON pt.user_id = ul.user_id AND pt.is_active = true
  INNER JOIN last_checks lc ON lc.user_id = ul.user_id
  WHERE
    -- Check exact days since last check (in user's timezone)
    (DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul')) - lc.last_check) = days_inactive
    -- Check this specific comeback notification hasn't been sent
    AND NOT EXISTS (
      SELECT 1 FROM notification_history nh
      WHERE nh.user_id = ul.user_id
        AND nh.notification_type = 'comeback_' || days_inactive || 'd'
        AND nh.sent_date = DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Update process_comeback_notifications for i18n
-- =====================================================

CREATE OR REPLACE FUNCTION process_comeback_notifications()
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
  v_days INTEGER;
  v_sent BOOLEAN;
BEGIN
  RAISE NOTICE 'Starting comeback notification processing';

  FOR v_days IN SELECT unnest(ARRAY[3, 7, 14])
  LOOP
    RAISE NOTICE 'Processing comeback_%d...', v_days;

    FOR v_user IN
      SELECT * FROM get_users_for_comeback_notification(v_days)
    LOOP
      v_users_processed := v_users_processed + 1;

      BEGIN
        -- Build personalized message based on language
        IF v_user.user_language = 'en' THEN
          -- English messages
          CASE v_days
            WHEN 3 THEN
              v_title := v_user.nickname || ', ready to start again? 💪';
              v_body := 'Just complete 1 item today.';
            WHEN 7 THEN
              v_title := v_user.nickname || ', your goals are waiting 🎯';
              v_body := 'You can start anytime.';
            WHEN 14 THEN
              v_title := v_user.nickname || ', time for new goals? ✨';
              v_body := 'Update your mandalart or create new goals.';
            ELSE
              v_title := v_user.nickname || ', ready to start again?';
              v_body := 'Your goals are waiting.';
          END CASE;
        ELSE
          -- Korean messages (default)
          CASE v_days
            WHEN 3 THEN
              v_title := v_user.nickname || '님, 다시 시작해볼까요? 💪';
              v_body := '오늘 1개만 실천해보세요.';
            WHEN 7 THEN
              v_title := v_user.nickname || '님, 목표가 기다리고 있어요 🎯';
              v_body := '언제든 다시 시작할 수 있어요.';
            WHEN 14 THEN
              v_title := v_user.nickname || '님, 새로운 목표를 세워볼까요? ✨';
              v_body := '만다라트를 수정하거나 새 목표를 만들어보세요.';
            ELSE
              v_title := v_user.nickname || '님, 다시 시작해볼까요?';
              v_body := '목표가 기다리고 있어요.';
          END CASE;
        END IF;

        -- Send push notification
        v_sent := send_expo_push_notification(
          v_user.push_token,
          v_title,
          v_body,
          jsonb_build_object('type', 'comeback_' || v_days || 'd', 'days_inactive', v_days)
        );

        IF v_sent THEN
          -- Record notification sent using user's local date
          INSERT INTO notification_history (user_id, notification_type, sent_date, metadata)
          VALUES (
            v_user.user_id,
            'comeback_' || v_days || 'd',
            DATE(NOW() AT TIME ZONE v_user.user_timezone),
            jsonb_build_object('days_inactive', v_days, 'last_check_date', v_user.last_check_date, 'user_timezone', v_user.user_timezone)
          );
          v_notifications_sent := v_notifications_sent + 1;
          RAISE NOTICE 'Comeback_%d sent to user: % (tz: %)', v_days, v_user.user_id, v_user.user_timezone;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_errors_count := v_errors_count + 1;
        RAISE WARNING 'Error processing user % for comeback_%d: %', v_user.user_id, v_days, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Comeback notification completed: users=%, sent=%, errors=%', v_users_processed, v_notifications_sent, v_errors_count;

  RETURN QUERY SELECT v_users_processed, v_notifications_sent, v_errors_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. Update cron jobs for hourly daily reminder check
-- =====================================================

-- Remove old specific hour cron jobs
DO $$
BEGIN
  PERFORM cron.unschedule('daily-reminder-18');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-reminder-19');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-reminder-20');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-reminder-21');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-reminder-22');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-reminder-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule single hourly job that checks all users' local times
SELECT cron.schedule(
  'daily-reminder-global',
  '0 * * * *',  -- Every hour at :00
  $$SELECT process_daily_reminder_notifications()$$
);

-- =====================================================
-- 8. Comments
-- =====================================================

COMMENT ON FUNCTION get_users_for_daily_reminder(INTEGER) IS '[v2 Timezone-aware] Returns users whose local reminder time matches the current hour';
COMMENT ON FUNCTION process_daily_reminder_notifications() IS '[v2 Timezone-aware] Process daily reminders based on each user''s local timezone';
COMMENT ON FUNCTION get_users_for_streak_warning() IS '[v2 Timezone-aware] Returns users who need streak warning based on their local time';
COMMENT ON FUNCTION process_streak_warning_notifications() IS '[v2 Timezone-aware] Process streak warnings with i18n support';
COMMENT ON FUNCTION get_users_for_comeback_notification(INTEGER) IS '[v2 Timezone-aware] Returns users inactive for specified days based on their timezone';
COMMENT ON FUNCTION process_comeback_notifications() IS '[v2 Timezone-aware] Process comeback notifications with i18n support';
