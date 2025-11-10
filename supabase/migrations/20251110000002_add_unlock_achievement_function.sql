-- Add unlock_achievement RPC function for safe badge unlocking
-- Prevents duplicate XP awards and ensures transactional consistency

-- 1. Create function to unlock achievement with XP reward
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_user_id UUID,
  p_achievement_id UUID,
  p_xp_reward INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_already_unlocked BOOLEAN;
  v_is_repeatable BOOLEAN;
  v_repeat_count INT;
  v_repeat_xp_multiplier DECIMAL(3,2);
  v_actual_xp INT;
BEGIN
  -- Check if achievement exists and get repeatability info
  SELECT is_repeatable, repeat_xp_multiplier
  INTO v_is_repeatable, v_repeat_xp_multiplier
  FROM achievements
  WHERE id = p_achievement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found: %', p_achievement_id;
  END IF;

  -- Check if already unlocked
  SELECT EXISTS(
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO v_already_unlocked;

  -- If not repeatable and already unlocked, do nothing
  IF v_already_unlocked AND NOT v_is_repeatable THEN
    RETURN FALSE;
  END IF;

  -- If repeatable and already unlocked, calculate repeat XP
  IF v_already_unlocked AND v_is_repeatable THEN
    -- Get current repeat count
    SELECT COALESCE(MAX(repeat_count), 0)
    INTO v_repeat_count
    FROM achievement_unlock_history
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id;

    v_repeat_count := v_repeat_count + 1;
    v_actual_xp := FLOOR(p_xp_reward * v_repeat_xp_multiplier);

    -- Insert into unlock history
    INSERT INTO achievement_unlock_history (
      user_id, achievement_id, xp_awarded, repeat_count
    ) VALUES (
      p_user_id, p_achievement_id, v_actual_xp, v_repeat_count
    );

    -- Award repeat XP
    UPDATE user_gamification
    SET total_xp = total_xp + v_actual_xp
    WHERE user_id = p_user_id;

    RETURN TRUE;
  END IF;

  -- First time unlock
  BEGIN
    -- Insert into user_achievements (transaction-safe)
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, p_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    -- Insert into unlock history
    INSERT INTO achievement_unlock_history (
      user_id, achievement_id, xp_awarded, repeat_count
    ) VALUES (
      p_user_id, p_achievement_id, p_xp_reward, 1
    );

    -- Award XP to user
    UPDATE user_gamification
    SET total_xp = total_xp + p_xp_reward
    WHERE user_id = p_user_id;

    RETURN TRUE;
  EXCEPTION
    WHEN unique_violation THEN
      -- Another process already unlocked this badge
      RETURN FALSE;
  END;
END;
$$;

-- 2. Create helper function to evaluate badge conditions
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

    -- Streak
    WHEN 'streak' THEN
      v_target_value := (p_unlock_condition->>'days')::INT;
      SELECT COALESCE(MAX(current_streak), 0) INTO v_current_value
      FROM user_gamification
      WHERE user_id = p_user_id;

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
          AND DATE_TRUNC('month', ch.checked_at) = DATE_TRUNC('month', CURRENT_DATE)
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
        SELECT DATE_TRUNC('month', CURRENT_DATE) + (INTERVAL '1 day' * s.day) as check_date
        FROM generate_series(0, EXTRACT(DAY FROM CURRENT_DATE)::INT - 1) s(day)
      ),
      checked_days AS (
        SELECT DISTINCT DATE(checked_at) as check_date
        FROM check_history
        WHERE user_id = p_user_id
          AND DATE_TRUNC('month', checked_at) = DATE_TRUNC('month', CURRENT_DATE)
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
          DATE_TRUNC('week', ch.checked_at) as week_start,
          COUNT(DISTINCT DATE(ch.checked_at)) as days_checked
        FROM check_history ch
        WHERE ch.user_id = p_user_id
          AND DATE_TRUNC('month', ch.checked_at) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY DATE_TRUNC('week', ch.checked_at)
        HAVING COUNT(DISTINCT DATE(ch.checked_at)) = 7
      )
      SELECT COUNT(*) INTO v_current_value
      FROM week_completion;

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

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION unlock_achievement TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_badge_progress TO authenticated;

-- 4. Add comments
COMMENT ON FUNCTION unlock_achievement IS 'Safely unlock achievement with XP reward, prevents duplicates';
COMMENT ON FUNCTION evaluate_badge_progress IS 'Calculate real-time progress for badge unlock conditions';
