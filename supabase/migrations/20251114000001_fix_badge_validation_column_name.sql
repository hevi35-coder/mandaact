-- Fix validate_badge_eligibility function to use correct column name
-- Bug: Line 116 references a.text which doesn't exist, should be a.title

CREATE OR REPLACE FUNCTION validate_badge_eligibility(
  p_user_id UUID,
  p_badge_key VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_rules JSONB;
  v_action_count INTEGER;
  v_min_text_length INTEGER;
  v_rapid_checks INTEGER;
BEGIN
  -- Get anti-cheat rules for the badge
  SELECT anti_cheat_rules INTO v_rules
  FROM achievements
  WHERE key = p_badge_key;

  -- If no rules, allow
  IF v_rules IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check minimum actions per mandalart
  IF v_rules->>'minActionsPerMandalart' IS NOT NULL THEN
    SELECT COUNT(*) INTO v_action_count
    FROM actions a
    JOIN sub_goals sg ON a.sub_goal_id = sg.id
    JOIN mandalarts m ON sg.mandalart_id = m.id
    WHERE m.user_id = p_user_id
      AND LENGTH(a.title) >= COALESCE((v_rules->>'minActionTextLength')::INTEGER, 5);

    IF v_action_count < (v_rules->>'minActionsPerMandalart')::INTEGER THEN
      -- Log validation failure
      INSERT INTO badge_validation_logs (user_id, badge_key, validation_type, passed, details)
      VALUES (p_user_id, p_badge_key, 'min_actions', FALSE,
        jsonb_build_object('required', v_rules->>'minActionsPerMandalart', 'actual', v_action_count));
      RETURN FALSE;
    END IF;
  END IF;

  -- Check for rapid checking pattern (anti-cheat)
  IF v_rules->>'minCheckInterval' IS NOT NULL THEN
    -- Check if there are too many checks within short intervals
    SELECT COUNT(*) INTO v_rapid_checks
    FROM (
      SELECT checked_at,
        LAG(checked_at) OVER (ORDER BY checked_at) as prev_checked_at
      FROM check_history
      WHERE user_id = p_user_id
        AND checked_at > NOW() - INTERVAL '1 day'
    ) t
    WHERE EXTRACT(EPOCH FROM (checked_at - prev_checked_at)) < (v_rules->>'minCheckInterval')::INTEGER;

    IF v_rapid_checks > 5 THEN -- Allow some rapid checks but not too many
      -- Log validation failure
      INSERT INTO badge_validation_logs (user_id, badge_key, validation_type, passed, details)
      VALUES (p_user_id, p_badge_key, 'rapid_checks', FALSE,
        jsonb_build_object('rapid_check_count', v_rapid_checks));
      RETURN FALSE;
    END IF;
  END IF;

  -- Log successful validation
  INSERT INTO badge_validation_logs (user_id, badge_key, validation_type, passed, details)
  VALUES (p_user_id, p_badge_key, 'full_validation', TRUE,
    jsonb_build_object('timestamp', NOW()));

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
