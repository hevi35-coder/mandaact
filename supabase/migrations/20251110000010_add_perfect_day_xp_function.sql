-- Perfect Day XP Award Function
-- Checks if a user completed all actions shown for a specific date and awards bonus XP

CREATE OR REPLACE FUNCTION check_and_award_perfect_day_xp(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_actions_for_day INT;
  v_completed_actions INT;
  v_is_perfect_day BOOLEAN;
  v_already_awarded BOOLEAN;
  v_xp_awarded INT := 0;
  v_result JSONB;
BEGIN
  -- Get all active mandalarts for user
  -- Count total actions that should be shown today (excluding reference type)
  SELECT COUNT(DISTINCT a.id)
  INTO v_total_actions_for_day
  FROM actions a
  INNER JOIN sub_goals sg ON a.sub_goal_id = sg.id
  INNER JOIN mandalarts m ON sg.mandalart_id = m.id
  WHERE m.user_id = p_user_id
    AND m.is_active = true
    AND a.type != 'reference'; -- Reference type는 체크 대상이 아님

  -- Get completed actions for the date (KST timezone)
  SELECT COUNT(DISTINCT ch.action_id)
  INTO v_completed_actions
  FROM check_history ch
  INNER JOIN actions a ON ch.action_id = a.id
  INNER JOIN sub_goals sg ON a.sub_goal_id = sg.id
  INNER JOIN mandalarts m ON sg.mandalart_id = m.id
  WHERE ch.user_id = p_user_id
    AND m.is_active = true
    AND DATE(ch.checked_at AT TIME ZONE 'Asia/Seoul') = p_date;

  -- Check if it's a perfect day
  v_is_perfect_day := (v_total_actions_for_day > 0 AND v_completed_actions = v_total_actions_for_day);

  -- Check if already awarded for this date
  SELECT EXISTS (
    SELECT 1
    FROM user_levels
    WHERE user_id = p_user_id
      AND last_perfect_day_date = p_date
  ) INTO v_already_awarded;

  -- Award XP if perfect day and not already awarded
  IF v_is_perfect_day AND NOT v_already_awarded THEN
    v_xp_awarded := 50;

    -- Update user level with XP and perfect day date
    UPDATE user_levels
    SET total_xp = total_xp + v_xp_awarded,
        last_perfect_day_date = p_date,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Create user level if not exists
    IF NOT FOUND THEN
      INSERT INTO user_levels (user_id, level, total_xp, last_perfect_day_date)
      VALUES (p_user_id, 1, v_xp_awarded, p_date);
    END IF;
  END IF;

  -- Return result
  v_result := jsonb_build_object(
    'is_perfect_day', v_is_perfect_day,
    'total_actions', v_total_actions_for_day,
    'completed_actions', v_completed_actions,
    'xp_awarded', v_xp_awarded,
    'already_awarded', v_already_awarded,
    'date', p_date
  );

  RETURN v_result;
END;
$$;

-- Comment
COMMENT ON FUNCTION check_and_award_perfect_day_xp IS 'Check if user completed all actions for a date and award +50 XP bonus (once per day)';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_and_award_perfect_day_xp TO authenticated;
