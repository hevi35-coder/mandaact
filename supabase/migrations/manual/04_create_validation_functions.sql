-- Step 4: Create Badge Validation Functions and Triggers
-- Run this in Supabase Dashboard SQL Editor

-- Function: Validate badge eligibility with anti-cheat
CREATE OR REPLACE FUNCTION validate_badge_eligibility(
  p_user_id UUID,
  p_badge_key VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_rules JSONB;
  v_action_count INTEGER;
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
      AND LENGTH(a.text) >= COALESCE((v_rules->>'minActionTextLength')::INTEGER, 5);

    IF v_action_count < (v_rules->>'minActionsPerMandalart')::INTEGER THEN
      INSERT INTO badge_validation_logs (user_id, badge_key, validation_type, passed, details)
      VALUES (p_user_id, p_badge_key, 'min_actions', FALSE,
        jsonb_build_object('required', v_rules->>'minActionsPerMandalart', 'actual', v_action_count));
      RETURN FALSE;
    END IF;
  END IF;

  -- Check for rapid checking pattern (anti-cheat)
  IF v_rules->>'minCheckInterval' IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rapid_checks
    FROM (
      SELECT checked_at,
        LAG(checked_at) OVER (ORDER BY checked_at) as prev_checked_at
      FROM check_history
      WHERE user_id = p_user_id
        AND checked_at > NOW() - INTERVAL '1 day'
    ) t
    WHERE EXTRACT(EPOCH FROM (checked_at - prev_checked_at)) < (v_rules->>'minCheckInterval')::INTEGER;

    IF v_rapid_checks > 5 THEN
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

-- Function: Check and award first mandalart badge
CREATE OR REPLACE FUNCTION check_first_mandalart_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = NEW.user_id
    AND achievement_id = (SELECT id FROM achievements WHERE key = 'first_mandalart')
  ) THEN
    IF validate_badge_eligibility(NEW.user_id, 'first_mandalart') THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      SELECT NEW.user_id, id FROM achievements WHERE key = 'first_mandalart';

      UPDATE user_levels
      SET total_xp = total_xp + 100
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: First mandalart badge
DROP TRIGGER IF EXISTS trigger_first_mandalart_badge ON mandalarts;
CREATE TRIGGER trigger_first_mandalart_badge
AFTER INSERT ON mandalarts
FOR EACH ROW
EXECUTE FUNCTION check_first_mandalart_badge();

-- Function: Check level-based badges
CREATE OR REPLACE FUNCTION check_level_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_current_level INTEGER;
BEGIN
  -- Calculate current level from XP
  v_current_level = FLOOR((SQRT(1 + 8 * NEW.total_xp / 100) - 1) / 2) + 1;

  -- Check Level 10 badge
  IF v_current_level >= 10 AND NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = NEW.user_id
    AND achievement_id = (SELECT id FROM achievements WHERE key = 'level_10')
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT NEW.user_id, id FROM achievements WHERE key = 'level_10';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Level badges
DROP TRIGGER IF EXISTS trigger_level_badges ON user_levels;
CREATE TRIGGER trigger_level_badges
AFTER UPDATE OF total_xp ON user_levels
FOR EACH ROW
WHEN (NEW.total_xp > OLD.total_xp)
EXECUTE FUNCTION check_level_badges();

-- Function: Check monthly champion badge
CREATE OR REPLACE FUNCTION check_monthly_champion(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS VOID AS $$
DECLARE
  v_total_days INTEGER;
  v_perfect_days INTEGER;
  v_achievement_id UUID;
BEGIN
  SELECT id INTO v_achievement_id FROM achievements WHERE key = 'monthly_champion';

  v_total_days := DATE_PART('days',
    DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day');

  WITH daily_stats AS (
    SELECT
      DATE(ch.checked_at) as check_date,
      COUNT(DISTINCT ch.action_id) as checked_count,
      COUNT(DISTINCT a.id) as total_actions
    FROM check_history ch
    JOIN actions a ON a.id = ch.action_id
    JOIN sub_goals sg ON a.sub_goal_id = sg.id
    JOIN mandalarts m ON sg.mandalart_id = m.id
    WHERE ch.user_id = p_user_id
      AND m.user_id = p_user_id
      AND m.is_active = true
      AND DATE_PART('year', ch.checked_at) = p_year
      AND DATE_PART('month', ch.checked_at) = p_month
    GROUP BY DATE(ch.checked_at)
  )
  SELECT COUNT(*) INTO v_perfect_days
  FROM daily_stats
  WHERE checked_count = total_actions;

  IF v_perfect_days = v_total_days THEN
    IF validate_badge_eligibility(p_user_id, 'monthly_champion') THEN
      INSERT INTO user_achievements (user_id, achievement_id, count)
      VALUES (p_user_id, v_achievement_id, 1)
      ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        count = user_achievements.count + 1,
        unlocked_at = NOW();

      UPDATE user_levels
      SET total_xp = total_xp + 1000
      WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT UPDATE ON user_achievements TO authenticated;

-- Success message
SELECT 'Step 4 Complete: Validation functions and triggers created successfully' as status;