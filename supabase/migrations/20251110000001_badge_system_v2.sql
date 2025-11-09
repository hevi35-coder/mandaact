-- Badge System v2.0 Migration
-- Adds hint levels, badge types, repeatability, and progress tracking

-- 1. Add new columns to achievements table
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS
  hint_level TEXT DEFAULT 'full' CHECK (hint_level IN ('full', 'cryptic', 'hidden')),
  badge_type TEXT DEFAULT 'permanent' CHECK (badge_type IN ('permanent', 'monthly', 'seasonal', 'event')),
  is_repeatable BOOLEAN DEFAULT false,
  repeat_xp_multiplier DECIMAL(3,2) DEFAULT 1.0 CHECK (repeat_xp_multiplier > 0 AND repeat_xp_multiplier <= 1.0),
  active_from TIMESTAMPTZ,
  active_until TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT false;

-- 2. Create achievement_progress table for tracking user progress
CREATE TABLE IF NOT EXISTS achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  progress_value DECIMAL(5,2) DEFAULT 0 CHECK (progress_value >= 0 AND progress_value <= 100),
  progress_current INT DEFAULT 0,
  progress_target INT,
  last_updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- 3. Create achievement_unlock_history for repeatable badges
CREATE TABLE IF NOT EXISTS achievement_unlock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  xp_awarded INT NOT NULL,
  repeat_count INT DEFAULT 1,
  unlock_context JSONB
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_achievement_progress_user ON achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_unlock_history_user ON achievement_unlock_history(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_badge_type ON achievements(badge_type);
CREATE INDEX IF NOT EXISTS idx_achievements_hint_level ON achievements(hint_level);

-- 5. Update existing badges with hint levels
UPDATE achievements SET hint_level = 'full' WHERE category IN ('streak', 'volume') AND key IN ('streak_7', 'streak_30', 'checks_100', 'checks_500', 'checks_1000', 'first_perfect_day');
UPDATE achievements SET hint_level = 'cryptic' WHERE category = 'special' AND key IN ('weekend_warrior', 'early_bird', 'balanced_goals');
UPDATE achievements SET hint_level = 'full' WHERE category = 'completion' AND key IN ('perfect_week_3', 'perfect_month');

-- 6. Rename existing badges to motivational tone (remove icon prefixes from titles)
UPDATE achievements SET title = '실천왕' WHERE key = 'perfect_week_3';
UPDATE achievements SET title = '이달의 챔피언', description = '월간 90%+ 완료 달성' WHERE key = 'perfect_month';
UPDATE achievements SET title = '밸런스 마스터' WHERE key = 'balanced_goals';
UPDATE achievements SET title = '아침형 인간' WHERE key = 'early_bird';
UPDATE achievements SET title = '주말 전사' WHERE key = 'weekend_warrior';

-- 7. Insert new beginner badges
INSERT INTO achievements (key, title, description, icon, category, xp_reward, unlock_condition, display_order, hint_level, badge_type) VALUES
  ('first_check', '첫걸음', '첫 번째 실천 완료', '👣', 'milestone', 25, '{"type": "total_checks", "count": 1}', 0, 'full', 'permanent'),
  ('streak_3', '3일의 기적', '3일 연속 실천 달성', '🔥', 'streak', 50, '{"type": "streak", "days": 3}', 0.5, 'full', 'permanent'),
  ('checks_50', '오십보백보', '총 50회 실천 완료', '💯', 'volume', 100, '{"type": "total_checks", "count": 50}', 6.5, 'full', 'permanent');

-- 8. Insert new intermediate badges
INSERT INTO achievements (key, title, description, icon, category, xp_reward, unlock_condition, display_order, hint_level, badge_type) VALUES
  ('streak_14', '2주 열정', '14일 연속 실천 달성', '🔥', 'streak', 200, '{"type": "streak", "days": 14}', 1.5, 'full', 'permanent'),
  ('checks_250', '이백오십', '총 250회 실천 완료', '💯', 'volume', 400, '{"type": "total_checks", "count": 250}', 7.5, 'full', 'permanent');

-- 9. Insert monthly challenge badges (repeatable)
INSERT INTO achievements (key, title, description, icon, category, xp_reward, unlock_condition, display_order, hint_level, badge_type, is_repeatable, repeat_xp_multiplier) VALUES
  ('monthly_90_percent', '이달의 MVP', '월간 90% 이상 완료 달성', '🏆', 'completion', 800, '{"type": "monthly_completion", "threshold": 90}', 13, 'full', 'monthly', true, 0.5),
  ('monthly_perfect_week', '주간 챔피언', '한 달 내 완벽한 주(100%) 달성', '⭐', 'completion', 500, '{"type": "perfect_week_in_month"}', 14, 'full', 'monthly', true, 0.5),
  ('monthly_streak_30', '월간 연속 달성', '한 달(30일) 연속 실천', '🔥', 'streak', 600, '{"type": "monthly_streak", "days": 30}', 15, 'full', 'monthly', true, 0.5);

-- 10. Add RLS policies for new tables
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_unlock_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON achievement_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON achievement_progress FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own unlock history"
  ON achievement_unlock_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unlock history"
  ON achievement_unlock_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 11. Add comments for documentation
COMMENT ON COLUMN achievements.hint_level IS 'Controls unlock condition visibility: full (transparent), cryptic (hint), hidden (???)';
COMMENT ON COLUMN achievements.badge_type IS 'Badge lifecycle type: permanent, monthly (resets), seasonal, event (time-limited)';
COMMENT ON COLUMN achievements.is_repeatable IS 'Whether badge can be unlocked multiple times';
COMMENT ON COLUMN achievements.repeat_xp_multiplier IS 'XP multiplier for repeat unlocks (e.g., 0.5 = 50% of original)';
COMMENT ON TABLE achievement_progress IS 'Tracks user progress toward unlocking achievements';
COMMENT ON TABLE achievement_unlock_history IS 'Historical record of all badge unlocks (including repeats)';
