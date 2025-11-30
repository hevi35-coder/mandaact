-- =====================================================
-- Update Weekly Report Function with Nickname
-- Created: 2025-11-30
-- Purpose: Add nickname field to weekly report user query
-- =====================================================

-- Drop existing function first (required to change return type)
DROP FUNCTION IF EXISTS get_users_for_weekly_report();

-- Recreate with nickname field
CREATE FUNCTION get_users_for_weekly_report()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  nickname TEXT,
  push_token TEXT,
  check_count BIGINT
) AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Same date calculation as batch function
  v_week_end := (CURRENT_DATE AT TIME ZONE 'Asia/Seoul' - INTERVAL '1 day')::DATE;
  v_week_start := v_week_end - INTERVAL '6 days';

  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email::TEXT,
    COALESCE(up.nickname, split_part(u.email, '@', 1))::TEXT as nickname,
    pt.token as push_token,
    COUNT(ch.id) as check_count
  FROM auth.users u
  INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
  LEFT JOIN push_tokens pt ON pt.user_id = u.id AND pt.is_active = true
  LEFT JOIN user_profiles up ON up.user_id = u.id
  LEFT JOIN sub_goals sg ON sg.mandalart_id = m.id
  LEFT JOIN actions a ON a.sub_goal_id = sg.id
  LEFT JOIN check_history ch ON ch.action_id = a.id
    AND ch.checked_at >= v_week_start::TIMESTAMPTZ
    AND ch.checked_at < (v_week_end + INTERVAL '1 day')::TIMESTAMPTZ
  GROUP BY u.id, u.email, up.nickname, pt.token
  HAVING COUNT(ch.id) >= 1;  -- At least 1 check in the period
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_users_for_weekly_report() TO service_role;

COMMENT ON FUNCTION get_users_for_weekly_report() IS 'Returns users eligible for weekly report generation with nickname for personalized push notifications';
