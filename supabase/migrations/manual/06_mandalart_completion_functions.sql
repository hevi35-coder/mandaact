-- Phase 2: Mandalart Completion Badge Functions
-- Run this in Supabase Dashboard SQL Editor

-- Function: Calculate mandalart completion percentage
CREATE OR REPLACE FUNCTION get_mandalart_completion(p_mandalart_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_actions INTEGER;
  v_completed_actions INTEGER;
  v_completion_percentage INTEGER;
BEGIN
  -- Get total actions for this mandalart
  SELECT COUNT(a.id) INTO v_total_actions
  FROM actions a
  JOIN sub_goals sg ON a.sub_goal_id = sg.id
  WHERE sg.mandalart_id = p_mandalart_id;

  -- Get completed actions (at least one check)
  SELECT COUNT(DISTINCT a.id) INTO v_completed_actions
  FROM actions a
  JOIN sub_goals sg ON a.sub_goal_id = sg.id
  LEFT JOIN check_history ch ON a.id = ch.action_id
  WHERE sg.mandalart_id = p_mandalart_id
    AND ch.id IS NOT NULL;

  -- Calculate percentage
  IF v_total_actions > 0 THEN
    v_completion_percentage := ROUND((v_completed_actions::NUMERIC / v_total_actions::NUMERIC) * 100);
  ELSE
    v_completion_percentage := 0;
  END IF;

  RETURN v_completion_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function: Check mandalart completion badges
CREATE OR REPLACE FUNCTION check_mandalart_completion_badges(
  p_user_id UUID,
  p_mandalart_id UUID
) RETURNS VOID AS $$
DECLARE
  v_completion_percentage INTEGER;
  v_badge_50_id UUID;
  v_badge_100_id UUID;
BEGIN
  -- Get completion percentage
  v_completion_percentage := get_mandalart_completion(p_mandalart_id);

  -- Get badge IDs
  SELECT id INTO v_badge_50_id FROM achievements WHERE key = 'mandalart_50';
  SELECT id INTO v_badge_100_id FROM achievements WHERE key = 'mandalart_100';

  -- Check 50% badge
  IF v_completion_percentage >= 50 AND NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id
    AND achievement_id = v_badge_50_id
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_badge_50_id);

    UPDATE user_levels
    SET total_xp = total_xp + 400
    WHERE user_id = p_user_id;
  END IF;

  -- Check 100% badge
  IF v_completion_percentage >= 100 AND NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id
    AND achievement_id = v_badge_100_id
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_badge_100_id);

    UPDATE user_levels
    SET total_xp = total_xp + 800
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Check completion badges on check
CREATE OR REPLACE FUNCTION trigger_check_mandalart_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_mandalart_id UUID;
BEGIN
  -- Get mandalart ID from action
  SELECT sg.mandalart_id INTO v_mandalart_id
  FROM actions a
  JOIN sub_goals sg ON a.sub_goal_id = sg.id
  WHERE a.id = NEW.action_id;

  -- Check completion badges
  PERFORM check_mandalart_completion_badges(NEW.user_id, v_mandalart_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on check_history
DROP TRIGGER IF EXISTS trigger_mandalart_completion_check ON check_history;
CREATE TRIGGER trigger_mandalart_completion_check
AFTER INSERT ON check_history
FOR EACH ROW
EXECUTE FUNCTION trigger_check_mandalart_completion();

-- Function: Check cumulative checks milestone (100의 힘)
CREATE OR REPLACE FUNCTION check_cumulative_checks_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_total_checks INTEGER;
  v_badge_id UUID;
  v_current_count INTEGER;
BEGIN
  -- Get total checks for user
  SELECT COUNT(*) INTO v_total_checks
  FROM check_history
  WHERE user_id = NEW.user_id;

  -- Get badge ID
  SELECT id INTO v_badge_id FROM achievements WHERE key = 'checks_100_v2';

  -- Check if user reached another 100 milestone
  IF v_total_checks % 100 = 0 THEN
    -- Get current count or initialize
    SELECT COALESCE(count, 0) INTO v_current_count
    FROM user_achievements
    WHERE user_id = NEW.user_id
    AND achievement_id = v_badge_id;

    IF v_current_count = 0 THEN
      -- First time achievement
      INSERT INTO user_achievements (user_id, achievement_id, count)
      VALUES (NEW.user_id, v_badge_id, 1);
    ELSE
      -- Increment count
      UPDATE user_achievements
      SET count = count + 1,
          unlocked_at = NOW()
      WHERE user_id = NEW.user_id
      AND achievement_id = v_badge_id;
    END IF;

    -- Award XP
    UPDATE user_levels
    SET total_xp = total_xp + 200
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cumulative checks
DROP TRIGGER IF EXISTS trigger_cumulative_checks_badge ON check_history;
CREATE TRIGGER trigger_cumulative_checks_badge
AFTER INSERT ON check_history
FOR EACH ROW
EXECUTE FUNCTION check_cumulative_checks_badges();

-- Success message
SELECT 'Mandalart completion functions created successfully' as status;