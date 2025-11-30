-- Add timezone-aware streak calculation support
-- Previously all streak calculations used hardcoded 'Asia/Seoul' timezone
-- This migration updates evaluate_badge_progress to use user's timezone from user_levels table

-- Helper function to get user's timezone
CREATE OR REPLACE FUNCTION get_user_timezone(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  SELECT timezone INTO v_timezone
  FROM user_levels
  WHERE user_id = p_user_id;

  -- Default to Asia/Seoul if not set
  RETURN COALESCE(v_timezone, 'Asia/Seoul');
END;
$$;

COMMENT ON FUNCTION get_user_timezone IS 'Get user timezone from user_levels table, defaults to Asia/Seoul';

-- Update evaluate_badge_progress to use user timezone
CREATE OR REPLACE FUNCTION evaluate_badge_progress(
  p_user_id UUID,
  p_achievement_id UUID,
  p_unlock_condition JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_condition_type TEXT;
  v_current_value INT;
  v_target_value INT;
  v_progress_percent DECIMAL(5,2);
  v_is_completed BOOLEAN;
  v_user_tz TEXT;
BEGIN
  -- Get user's timezone
  v_user_tz := get_user_timezone(p_user_id);

  v_condition_type := p_unlock_condition->>'type';

  CASE v_condition_type
    -- Total checks
    WHEN 'total_checks' THEN
      v_target_value := (p_unlock_condition->>'count')::INT;
      SELECT COUNT(*) INTO v_current_value
      FROM check_history
      WHERE user_id = p_user_id;

    -- Streak - Uses user timezone
    WHEN 'streak' THEN
      v_target_value := (p_unlock_condition->>'days')::INT;
      -- Calculate current streak from check_history using user's timezone
      WITH RECURSIVE date_series AS (
        -- Start from today (in user's timezone) and go backwards
        SELECT (NOW() AT TIME ZONE v_user_tz)::DATE as check_date, 0 as days_back
        UNION ALL
        SELECT (check_date - INTERVAL '1 day')::DATE, days_back + 1
        FROM date_series
        WHERE days_back < 365 -- Max 1 year lookback
      ),
      daily_checks AS (
        SELECT DISTINCT DATE(checked_at AT TIME ZONE v_user_tz) as check_date
        FROM check_history
        WHERE user_id = p_user_id
      ),
      streak_days AS (
        SELECT ds.check_date, ds.days_back
        FROM date_series ds
        WHERE EXISTS (
          SELECT 1 FROM daily_checks dc WHERE dc.check_date = ds.check_date
        )
        ORDER BY ds.check_date DESC
      ),
      consecutive_streak AS (
        SELECT check_date, days_back,
          check_date - (ROW_NUMBER() OVER (ORDER BY check_date DESC))::INT * INTERVAL '1 day' as grp
        FROM streak_days
        WHERE days_back = (SELECT MIN(days_back) FROM streak_days)
          OR days_back - 1 = (SELECT MIN(days_back) FROM streak_days WHERE days_back > (SELECT MIN(days_back) FROM streak_days LIMIT 1))
      )
      SELECT COALESCE(COUNT(*), 0) INTO v_current_value
      FROM consecutive_streak
      WHERE grp = (SELECT grp FROM consecutive_streak ORDER BY check_date DESC LIMIT 1);

    -- Monthly completion - Uses user timezone
    WHEN 'monthly_completion' THEN
      v_target_value := (p_unlock_condition->>'threshold')::INT;
      -- Calculate current month completion rate using user's timezone
      WITH monthly_actions AS (
        SELECT
          COUNT(DISTINCT a.id) as total_actions,
          COUNT(DISTINCT ch.action_id) as completed_actions
        FROM actions a
        LEFT JOIN check_history ch ON ch.action_id = a.id
          AND ch.user_id = p_user_id
          AND DATE_TRUNC('month', ch.checked_at AT TIME ZONE v_user_tz) = DATE_TRUNC('month', (NOW() AT TIME ZONE v_user_tz)::DATE)
        WHERE a.sub_goal_id IN (
          SELECT sg.id FROM sub_goals sg
          JOIN mandalarts m ON m.id = sg.mandalart_id
          WHERE m.user_id = p_user_id AND m.is_active = true
        )
      )
      SELECT FLOOR((completed_actions::DECIMAL / NULLIF(total_actions, 0)) * 100)
      INTO v_current_value
      FROM monthly_actions;
      v_current_value := COALESCE(v_current_value, 0);

    -- Monthly streak - Uses user timezone
    WHEN 'monthly_streak' THEN
      v_target_value := (p_unlock_condition->>'days')::INT;
      -- Check if user has checked every day this month using user's timezone
      WITH month_days AS (
        SELECT DATE_TRUNC('month', (NOW() AT TIME ZONE v_user_tz)::DATE) + (INTERVAL '1 day' * s.day) as check_date
        FROM generate_series(0, EXTRACT(DAY FROM (NOW() AT TIME ZONE v_user_tz)::DATE)::INT - 1) s(day)
      ),
      checked_days AS (
        SELECT DISTINCT DATE(checked_at AT TIME ZONE v_user_tz) as check_date
        FROM check_history
        WHERE user_id = p_user_id
          AND DATE_TRUNC('month', checked_at AT TIME ZONE v_user_tz) = DATE_TRUNC('month', (NOW() AT TIME ZONE v_user_tz)::DATE)
      )
      SELECT COUNT(*) INTO v_current_value
      FROM month_days md
      WHERE EXISTS (
        SELECT 1 FROM checked_days cd WHERE cd.check_date = DATE(md.check_date)
      );

    -- Perfect week in month - Uses user timezone
    WHEN 'perfect_week_in_month' THEN
      v_target_value := 1; -- Need at least one perfect week
      -- Check for any complete week (Mon-Sun) with 100% completion using user's timezone
      WITH week_completion AS (
        SELECT
          DATE_TRUNC('week', ch.checked_at AT TIME ZONE v_user_tz) as week_start,
          COUNT(DISTINCT DATE(ch.checked_at AT TIME ZONE v_user_tz)) as days_checked
        FROM check_history ch
        WHERE ch.user_id = p_user_id
          AND DATE_TRUNC('month', ch.checked_at AT TIME ZONE v_user_tz) = DATE_TRUNC('month', (NOW() AT TIME ZONE v_user_tz)::DATE)
        GROUP BY DATE_TRUNC('week', ch.checked_at AT TIME ZONE v_user_tz)
        HAVING COUNT(DISTINCT DATE(ch.checked_at AT TIME ZONE v_user_tz)) = 7
      )
      SELECT COUNT(*) INTO v_current_value
      FROM week_completion;

    -- Perfect month count (milestone badge) - Uses user timezone
    WHEN 'perfect_month_count' THEN
      v_target_value := (p_unlock_condition->>'count')::INT;
      -- Count how many times user achieved 100% monthly completion using user's timezone
      WITH monthly_completion_history AS (
        SELECT
          DATE_TRUNC('month', ch.checked_at AT TIME ZONE v_user_tz) as month,
          COUNT(DISTINCT a.id) as total_actions,
          COUNT(DISTINCT ch.action_id) as completed_actions
        FROM actions a
        LEFT JOIN check_history ch ON ch.action_id = a.id
          AND ch.user_id = p_user_id
        WHERE a.sub_goal_id IN (
          SELECT sg.id FROM sub_goals sg
          JOIN mandalarts m ON m.id = sg.mandalart_id
          WHERE m.user_id = p_user_id
        )
        GROUP BY DATE_TRUNC('month', ch.checked_at AT TIME ZONE v_user_tz)
      )
      SELECT COUNT(*) INTO v_current_value
      FROM monthly_completion_history
      WHERE completed_actions = total_actions AND total_actions > 0;
      v_current_value := COALESCE(v_current_value, 0);

    -- Midnight checks (secret badge) - Uses user timezone
    WHEN 'midnight_checks' THEN
      v_target_value := (p_unlock_condition->>'count')::INT;
      -- Count checks between 00:00-00:59 in user's timezone
      SELECT COUNT(*) INTO v_current_value
      FROM check_history
      WHERE user_id = p_user_id
        AND EXTRACT(HOUR FROM checked_at AT TIME ZONE v_user_tz) = 0;

    -- Balanced mandalart week (secret badge) - Uses user timezone
    WHEN 'balanced_mandalart_week' THEN
      v_target_value := (p_unlock_condition->>'min_days')::INT;
      DECLARE
        v_min_mandalarts INT := (p_unlock_condition->>'min_mandalarts')::INT;
      BEGIN
        -- Check for any 7-day period where user checked min_mandalarts different mandalarts each day
        WITH daily_mandalart_diversity AS (
          SELECT
            DATE(ch.checked_at AT TIME ZONE v_user_tz) as check_date,
            COUNT(DISTINCT m.id) as unique_mandalarts
          FROM check_history ch
          JOIN actions a ON a.id = ch.action_id
          JOIN sub_goals sg ON sg.id = a.sub_goal_id
          JOIN mandalarts m ON m.id = sg.mandalart_id
          WHERE ch.user_id = p_user_id
            AND m.is_active = true
          GROUP BY DATE(ch.checked_at AT TIME ZONE v_user_tz)
          HAVING COUNT(DISTINCT m.id) >= v_min_mandalarts
        ),
        consecutive_days AS (
          SELECT
            check_date,
            check_date - (ROW_NUMBER() OVER (ORDER BY check_date))::INT * INTERVAL '1 day' as grp
          FROM daily_mandalart_diversity
        ),
        max_streak AS (
          SELECT MAX(day_count) as longest_streak
          FROM (
            SELECT COUNT(*) as day_count
            FROM consecutive_days
            GROUP BY grp
          ) streaks
        )
        SELECT COALESCE(longest_streak, 0) INTO v_current_value
        FROM max_streak;
      END;

    -- Time range checks (secret badge) - Uses user timezone
    WHEN 'time_range_checks' THEN
      v_target_value := (p_unlock_condition->>'count')::INT;
      DECLARE
        v_start_hour INT := (p_unlock_condition->>'start_hour')::INT;
        v_end_hour INT := (p_unlock_condition->>'end_hour')::INT;
      BEGIN
        -- Count checks within specified hour range in user's timezone
        SELECT COUNT(*) INTO v_current_value
        FROM check_history
        WHERE user_id = p_user_id
          AND EXTRACT(HOUR FROM checked_at AT TIME ZONE v_user_tz) >= v_start_hour
          AND EXTRACT(HOUR FROM checked_at AT TIME ZONE v_user_tz) < v_end_hour;
      END;

    ELSE
      v_current_value := 0;
      v_target_value := 1;
  END CASE;

  -- Calculate progress
  v_progress_percent := LEAST(100, (v_current_value::DECIMAL / NULLIF(v_target_value, 0)) * 100);
  v_is_completed := v_current_value >= v_target_value;

  RETURN jsonb_build_object(
    'current', v_current_value,
    'target', v_target_value,
    'progress', v_progress_percent,
    'completed', v_is_completed
  );
END;
$$;

COMMENT ON FUNCTION evaluate_badge_progress IS '[v3 Timezone-aware] Calculate real-time progress for badge unlock conditions. Now uses user timezone from user_levels table. Supports types: total_checks, streak, monthly_completion, monthly_streak, perfect_week_in_month, perfect_month_count, midnight_checks, balanced_mandalart_week, time_range_checks';
