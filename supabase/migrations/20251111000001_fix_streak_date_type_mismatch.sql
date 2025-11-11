-- Fix: Streak calculation date type mismatch in recursive CTE
-- Error: recursive query "date_series" column 1 has type date in non-recursive term
--        but type timestamp without time zone overall
-- Solution: Cast CURRENT_DATE to DATE explicitly in both parts

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
BEGIN
  v_condition_type := p_unlock_condition->>'type';

  CASE v_condition_type
    -- Total checks
    WHEN 'total_checks' THEN
      v_target_value := (p_unlock_condition->>'count')::INT;
      SELECT COUNT(*) INTO v_current_value
      FROM check_history
      WHERE user_id = p_user_id;

    -- Streak - FIXED: Type mismatch in recursive CTE
    WHEN 'streak' THEN
      v_target_value := (p_unlock_condition->>'days')::INT;
      -- Calculate current streak from check_history
      WITH RECURSIVE date_series AS (
        -- Start from today and go backwards (ensure DATE type)
        SELECT CURRENT_DATE::DATE as check_date, 0 as days_back
        UNION ALL
        SELECT (check_date - INTERVAL '1 day')::DATE, days_back + 1
        FROM date_series
        WHERE days_back < 365 -- Max 1 year lookback
      ),
      daily_checks AS (
        SELECT DISTINCT DATE(checked_at AT TIME ZONE 'Asia/Seoul') as check_date
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

    -- Monthly completion
    WHEN 'monthly_completion' THEN
      v_target_value := (p_unlock_condition->>'threshold')::INT;
      -- Calculate current month completion rate
      WITH monthly_actions AS (
        SELECT
          COUNT(DISTINCT a.id) as total_actions,
          COUNT(DISTINCT ch.action_id) as completed_actions
        FROM actions a
        LEFT JOIN check_history ch ON ch.action_id = a.id
          AND ch.user_id = p_user_id
          AND DATE_TRUNC('month', ch.checked_at AT TIME ZONE 'Asia/Seoul') = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul')::DATE)
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

    -- Monthly streak
    WHEN 'monthly_streak' THEN
      v_target_value := (p_unlock_condition->>'days')::INT;
      -- Check if user has checked every day this month
      WITH month_days AS (
        SELECT DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul')::DATE) + (INTERVAL '1 day' * s.day) as check_date
        FROM generate_series(0, EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Asia/Seoul')::DATE)::INT - 1) s(day)
      ),
      checked_days AS (
        SELECT DISTINCT DATE(checked_at AT TIME ZONE 'Asia/Seoul') as check_date
        FROM check_history
        WHERE user_id = p_user_id
          AND DATE_TRUNC('month', checked_at AT TIME ZONE 'Asia/Seoul') = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul')::DATE)
      )
      SELECT COUNT(*) INTO v_current_value
      FROM month_days md
      WHERE EXISTS (
        SELECT 1 FROM checked_days cd WHERE cd.check_date = DATE(md.check_date)
      );

    -- Perfect week in month
    WHEN 'perfect_week_in_month' THEN
      v_target_value := 1; -- Need at least one perfect week
      -- Check for any complete week (Mon-Sun) with 100% completion
      WITH week_completion AS (
        SELECT
          DATE_TRUNC('week', ch.checked_at AT TIME ZONE 'Asia/Seoul') as week_start,
          COUNT(DISTINCT DATE(ch.checked_at AT TIME ZONE 'Asia/Seoul')) as days_checked
        FROM check_history ch
        WHERE ch.user_id = p_user_id
          AND DATE_TRUNC('month', ch.checked_at AT TIME ZONE 'Asia/Seoul') = DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul')::DATE)
        GROUP BY DATE_TRUNC('week', ch.checked_at AT TIME ZONE 'Asia/Seoul')
        HAVING COUNT(DISTINCT DATE(ch.checked_at AT TIME ZONE 'Asia/Seoul')) = 7
      )
      SELECT COUNT(*) INTO v_current_value
      FROM week_completion;

    -- Perfect month count (milestone badge)
    WHEN 'perfect_month_count' THEN
      v_target_value := (p_unlock_condition->>'count')::INT;
      -- Count how many times user achieved 100% monthly completion
      WITH monthly_completion_history AS (
        SELECT
          DATE_TRUNC('month', ch.checked_at AT TIME ZONE 'Asia/Seoul') as month,
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
        GROUP BY DATE_TRUNC('month', ch.checked_at AT TIME ZONE 'Asia/Seoul')
      )
      SELECT COUNT(*) INTO v_current_value
      FROM monthly_completion_history
      WHERE completed_actions = total_actions AND total_actions > 0;
      v_current_value := COALESCE(v_current_value, 0);

    -- Midnight checks (secret badge)
    WHEN 'midnight_checks' THEN
      v_target_value := (p_unlock_condition->>'count')::INT;
      -- Count checks between 00:00-00:59 KST
      SELECT COUNT(*) INTO v_current_value
      FROM check_history
      WHERE user_id = p_user_id
        AND EXTRACT(HOUR FROM checked_at AT TIME ZONE 'Asia/Seoul') = 0;

    -- Balanced mandalart week (secret badge)
    WHEN 'balanced_mandalart_week' THEN
      v_target_value := (p_unlock_condition->>'min_days')::INT;
      DECLARE
        v_min_mandalarts INT := (p_unlock_condition->>'min_mandalarts')::INT;
      BEGIN
        -- Check for any 7-day period where user checked min_mandalarts different mandalarts each day
        WITH daily_mandalart_diversity AS (
          SELECT
            DATE(ch.checked_at AT TIME ZONE 'Asia/Seoul') as check_date,
            COUNT(DISTINCT m.id) as unique_mandalarts
          FROM check_history ch
          JOIN actions a ON a.id = ch.action_id
          JOIN sub_goals sg ON sg.id = a.sub_goal_id
          JOIN mandalarts m ON m.id = sg.mandalart_id
          WHERE ch.user_id = p_user_id
            AND m.is_active = true
          GROUP BY DATE(ch.checked_at AT TIME ZONE 'Asia/Seoul')
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

    -- Time range checks (secret badge)
    WHEN 'time_range_checks' THEN
      v_target_value := (p_unlock_condition->>'count')::INT;
      DECLARE
        v_start_hour INT := (p_unlock_condition->>'start_hour')::INT;
        v_end_hour INT := (p_unlock_condition->>'end_hour')::INT;
      BEGIN
        -- Count checks within specified hour range (KST)
        SELECT COUNT(*) INTO v_current_value
        FROM check_history
        WHERE user_id = p_user_id
          AND EXTRACT(HOUR FROM checked_at AT TIME ZONE 'Asia/Seoul') >= v_start_hour
          AND EXTRACT(HOUR FROM checked_at AT TIME ZONE 'Asia/Seoul') < v_end_hour;
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

-- Update function comment
COMMENT ON FUNCTION evaluate_badge_progress IS '[FIXED v2] Calculate real-time progress for badge unlock conditions. Fixed date type mismatch in streak calculation. Supports types: total_checks, streak, monthly_completion, monthly_streak, perfect_week_in_month, perfect_month_count, midnight_checks, balanced_mandalart_week, time_range_checks';
