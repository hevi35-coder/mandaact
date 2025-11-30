-- =====================================================
-- Timezone-Aware Weekly Report
-- Created: 2025-11-30
-- Purpose: Update weekly report function to use user's timezone
--          and include language preference for i18n support
-- =====================================================

-- Drop existing function first (required to change return type)
DROP FUNCTION IF EXISTS get_users_for_weekly_report();

-- Recreate with timezone and language fields
CREATE FUNCTION get_users_for_weekly_report()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  nickname TEXT,
  push_token TEXT,
  check_count BIGINT,
  user_timezone TEXT,
  user_language TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email::TEXT,
    COALESCE(ul.nickname, split_part(u.email, '@', 1))::TEXT as nickname,
    pt.token as push_token,
    -- Count checks in user's local "last week" (7 days ending yesterday)
    (
      SELECT COUNT(ch.id)
      FROM check_history ch
      WHERE ch.user_id = u.id
        AND DATE(ch.checked_at AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))
            BETWEEN (DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul')) - INTERVAL '7 days')::DATE
            AND (DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul')) - INTERVAL '1 day')::DATE
    ) as check_count,
    COALESCE(ul.timezone, 'Asia/Seoul')::TEXT as user_timezone,
    COALESCE(ul.language, 'ko')::TEXT as user_language
  FROM auth.users u
  INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
  LEFT JOIN push_tokens pt ON pt.user_id = u.id AND pt.is_active = true
  LEFT JOIN user_levels ul ON ul.user_id = u.id
  WHERE
    -- At least 1 check in the last 7 days (user's timezone)
    EXISTS (
      SELECT 1 FROM check_history ch
      WHERE ch.user_id = u.id
        AND DATE(ch.checked_at AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))
            >= (DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul')) - INTERVAL '7 days')::DATE
    )
  GROUP BY u.id, u.email, ul.nickname, pt.token, ul.timezone, ul.language;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_users_for_weekly_report() TO service_role;

COMMENT ON FUNCTION get_users_for_weekly_report() IS '[v2 Timezone-aware] Returns users eligible for weekly report with timezone and language for i18n support';
