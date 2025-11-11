-- Fix: unlock_achievement function references non-existent user_gamification table
-- Should use user_levels table instead

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

    -- Award repeat XP (FIXED: use user_levels instead of user_gamification)
    UPDATE user_levels
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

    -- Award XP to user (FIXED: use user_levels instead of user_gamification)
    UPDATE user_levels
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

-- Update comment
COMMENT ON FUNCTION unlock_achievement IS '[FIXED] Safely unlock achievement with XP reward to user_levels table, prevents duplicates';
