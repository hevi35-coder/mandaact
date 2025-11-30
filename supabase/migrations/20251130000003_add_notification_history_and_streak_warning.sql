-- =====================================================
-- Notification History & Streak Warning System
-- Created: 2025-11-30
-- Purpose:
--   1. Track notification history (prevent duplicates)
--   2. Setup streak warning notification cron job
--   3. Setup comeback notification cron job
-- =====================================================

-- =====================================================
-- 1. Notification History Table (중복 방지용)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_date DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'Asia/Seoul'),
  metadata JSONB DEFAULT '{}'
);

-- Unique constraint to prevent duplicate notifications per day
CREATE UNIQUE INDEX IF NOT EXISTS unique_notification_per_day
  ON notification_history(user_id, notification_type, sent_date);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_notification_history_user_type
  ON notification_history(user_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at
  ON notification_history(sent_at);

-- RLS Policies
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification history
CREATE POLICY "Users can view own notification history"
  ON notification_history FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all (for Edge Functions)
CREATE POLICY "Service role full access on notification_history"
  ON notification_history FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 2. Get Users for Streak Warning
-- Returns users who:
--   - Have active mandalart
--   - Have current streak >= 3 days
--   - Have 0 checks today
--   - Haven't received streak_warning today
--   - Have active push token
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_for_streak_warning()
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  email TEXT,
  push_token TEXT,
  current_streak INTEGER
) AS $$
DECLARE
  v_today DATE;
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
BEGIN
  -- Calculate today's range in KST
  v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
  v_today_start := v_today::TIMESTAMPTZ AT TIME ZONE 'Asia/Seoul';
  v_today_end := (v_today + INTERVAL '1 day')::TIMESTAMPTZ AT TIME ZONE 'Asia/Seoul';

  RETURN QUERY
  SELECT
    u.id as user_id,
    COALESCE(up.nickname, split_part(u.email, '@', 1)) as nickname,
    u.email::TEXT,
    pt.token as push_token,
    COALESCE(us.current_streak, 0)::INTEGER as current_streak
  FROM auth.users u
  -- Must have active mandalart
  INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
  -- Must have streak >= 3
  INNER JOIN user_stats us ON us.user_id = u.id AND us.current_streak >= 3
  -- Must have active push token
  INNER JOIN push_tokens pt ON pt.user_id = u.id AND pt.is_active = true
  -- Optional: user profile for nickname
  LEFT JOIN user_profiles up ON up.user_id = u.id
  WHERE
    -- No checks today
    NOT EXISTS (
      SELECT 1 FROM check_history ch
      WHERE ch.user_id = u.id
        AND ch.checked_at >= v_today_start
        AND ch.checked_at < v_today_end
    )
    -- Haven't sent streak_warning today
    AND NOT EXISTS (
      SELECT 1 FROM notification_history nh
      WHERE nh.user_id = u.id
        AND nh.notification_type = 'streak_warning'
        AND nh.sent_date = v_today
    )
  GROUP BY u.id, up.nickname, u.email, pt.token, us.current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Get Users for Comeback Notification
-- Returns users who:
--   - Have active mandalart
--   - Last check was X days ago (3, 7, or 14)
--   - Haven't received comeback_Xd notification yet
--   - Have active push token
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_for_comeback_notification(days_inactive INTEGER)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  email TEXT,
  push_token TEXT,
  last_check_date DATE,
  days_since_last_check INTEGER
) AS $$
DECLARE
  v_today DATE;
  v_notification_type TEXT;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;
  v_notification_type := 'comeback_' || days_inactive || 'd';

  RETURN QUERY
  SELECT
    u.id as user_id,
    COALESCE(up.nickname, split_part(u.email, '@', 1)) as nickname,
    u.email::TEXT,
    pt.token as push_token,
    us.last_check_date,
    (v_today - us.last_check_date)::INTEGER as days_since_last_check
  FROM auth.users u
  -- Must have active mandalart
  INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
  -- Must have user stats with last_check_date
  INNER JOIN user_stats us ON us.user_id = u.id
    AND us.last_check_date IS NOT NULL
    AND (v_today - us.last_check_date) = days_inactive
  -- Must have active push token
  INNER JOIN push_tokens pt ON pt.user_id = u.id AND pt.is_active = true
  -- Optional: user profile for nickname
  LEFT JOIN user_profiles up ON up.user_id = u.id
  WHERE
    -- Haven't sent this comeback notification yet
    NOT EXISTS (
      SELECT 1 FROM notification_history nh
      WHERE nh.user_id = u.id
        AND nh.notification_type = v_notification_type
    )
  GROUP BY u.id, up.nickname, u.email, pt.token, us.last_check_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Record Notification Sent
-- =====================================================

CREATE OR REPLACE FUNCTION record_notification_sent(
  p_user_id UUID,
  p_notification_type TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
  v_today DATE;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;

  INSERT INTO notification_history (user_id, notification_type, sent_date, metadata)
  VALUES (p_user_id, p_notification_type, v_today, p_metadata)
  ON CONFLICT (user_id, notification_type, sent_date) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION get_users_for_streak_warning() TO service_role;
GRANT EXECUTE ON FUNCTION get_users_for_comeback_notification(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION record_notification_sent(UUID, TEXT, JSONB) TO service_role;

-- =====================================================
-- 6. Comments
-- =====================================================

COMMENT ON TABLE notification_history IS 'Tracks sent notifications to prevent duplicates';
COMMENT ON FUNCTION get_users_for_streak_warning() IS 'Returns users eligible for streak warning notification';
COMMENT ON FUNCTION get_users_for_comeback_notification(INTEGER) IS 'Returns users eligible for comeback notification (3d, 7d, 14d)';
COMMENT ON FUNCTION record_notification_sent(UUID, TEXT, JSONB) IS 'Records that a notification was sent to a user';
