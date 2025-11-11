-- Badge System Improvements Migration
-- Add category, tier, and anti-cheat fields to achievements table

-- First, drop existing category constraint if exists
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_category_check;

-- Add or update columns to achievements table
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'one_time',
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS anti_cheat_rules JSONB,
ADD COLUMN IF NOT EXISTS max_count INTEGER DEFAULT 1;

-- Add the new category constraint
ALTER TABLE achievements
ADD CONSTRAINT achievements_category_check
CHECK (category IN ('one_time', 'recurring', 'limited', 'hidden', 'social'));

-- Add the tier constraint
ALTER TABLE achievements
ADD CONSTRAINT achievements_tier_check
CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Add new columns to user_achievements table
ALTER TABLE user_achievements
ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS authenticity_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;

-- Create badge validation logs table
CREATE TABLE IF NOT EXISTS badge_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key VARCHAR(50) NOT NULL,
  validation_type VARCHAR(20) NOT NULL,
  passed BOOLEAN NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_badge_validation_logs_user_id ON badge_validation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_validation_logs_created_at ON badge_validation_logs(created_at);

-- Update existing badges with categories
UPDATE achievements SET category = 'one_time', tier = 'bronze' WHERE key = 'first_check';
UPDATE achievements SET category = 'one_time', tier = 'silver' WHERE key = 'streak_7';
UPDATE achievements SET category = 'one_time', tier = 'silver' WHERE key = 'streak_30';
UPDATE achievements SET category = 'one_time', tier = 'gold' WHERE key = 'streak_60';
UPDATE achievements SET category = 'one_time', tier = 'platinum' WHERE key = 'streak_100';
UPDATE achievements SET category = 'one_time', tier = 'platinum' WHERE key = 'streak_150';
UPDATE achievements SET category = 'recurring', tier = 'gold', max_count = 999 WHERE key = 'perfect_day';
UPDATE achievements SET category = 'recurring', tier = 'gold', max_count = 999 WHERE key = 'checks_100';
UPDATE achievements SET category = 'recurring', tier = 'platinum', max_count = 999 WHERE key = 'checks_1000';

-- Insert Phase 1 new badges
INSERT INTO achievements (key, title, description, icon, xp_reward, display_order, category, tier, anti_cheat_rules) VALUES
-- First mandalart badge (if not exists)
('first_mandalart', '첫 걸음', '첫 번째 만다라트를 생성했습니다', '🌱', 100, 1, 'one_time', 'bronze',
  '{"minActionsPerMandalart": 16, "minActionTextLength": 5}'::jsonb),
-- Level badges
('level_10', '성장하는 나무', '레벨 10을 달성했습니다', '📈', 300, 15, 'one_time', 'silver', NULL),
-- Monthly champion (recurring)
('monthly_champion', '월간 챔피언', '한 달 동안 100% 달성했습니다', '🏅', 1000, 20, 'recurring', 'gold',
  '{"minActionsPerMandalart": 16, "minCheckInterval": 60, "maxDailyChecks": 50}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  anti_cheat_rules = EXCLUDED.anti_cheat_rules;

-- Create function to validate badge eligibility with anti-cheat
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
      AND LENGTH(a.text) >= COALESCE((v_rules->>'minActionTextLength')::INTEGER, 5);

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

-- Create function to check and award first mandalart badge
CREATE OR REPLACE FUNCTION check_first_mandalart_badge()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already has the badge
  IF NOT EXISTS (
    SELECT 1 FROM user_achievements
    WHERE user_id = NEW.user_id
    AND achievement_id = (SELECT id FROM achievements WHERE key = 'first_mandalart')
  ) THEN
    -- Validate eligibility
    IF validate_badge_eligibility(NEW.user_id, 'first_mandalart') THEN
      -- Award the badge
      INSERT INTO user_achievements (user_id, achievement_id)
      SELECT NEW.user_id, id FROM achievements WHERE key = 'first_mandalart';

      -- Update user XP
      UPDATE user_levels
      SET total_xp = total_xp + 100
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for first mandalart badge
DROP TRIGGER IF EXISTS trigger_first_mandalart_badge ON mandalarts;
CREATE TRIGGER trigger_first_mandalart_badge
AFTER INSERT ON mandalarts
FOR EACH ROW
EXECUTE FUNCTION check_first_mandalart_badge();

-- Create function to check level-based badges
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

-- Create trigger for level badges
DROP TRIGGER IF EXISTS trigger_level_badges ON user_levels;
CREATE TRIGGER trigger_level_badges
AFTER UPDATE OF total_xp ON user_levels
FOR EACH ROW
WHEN (NEW.total_xp > OLD.total_xp)
EXECUTE FUNCTION check_level_badges();

-- Create function to check monthly champion badge
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
  -- Get achievement ID
  SELECT id INTO v_achievement_id FROM achievements WHERE key = 'monthly_champion';

  -- Get number of days in the month
  v_total_days := DATE_PART('days',
    DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day');

  -- Count perfect days in the month
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

  -- Award badge if achieved 100% for the entire month
  IF v_perfect_days = v_total_days THEN
    -- Validate anti-cheat
    IF validate_badge_eligibility(p_user_id, 'monthly_champion') THEN
      -- Check current count for this user
      INSERT INTO user_achievements (user_id, achievement_id, count)
      VALUES (p_user_id, v_achievement_id, 1)
      ON CONFLICT (user_id, achievement_id)
      DO UPDATE SET
        count = user_achievements.count + 1,
        unlocked_at = NOW();

      -- Award XP
      UPDATE user_levels
      SET total_xp = total_xp + 1000
      WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT ON badge_validation_logs TO authenticated;
GRANT UPDATE ON user_achievements TO authenticated;

-- Add RLS policies for badge_validation_logs
ALTER TABLE badge_validation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own validation logs"
  ON badge_validation_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert validation logs"
  ON badge_validation_logs FOR INSERT
  WITH CHECK (true);