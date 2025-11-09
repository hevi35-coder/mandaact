-- Add gamification tables for achievements, levels, and AI reports

-- User Levels table
CREATE TABLE user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  level INT DEFAULT 1 NOT NULL CHECK (level >= 1),
  total_xp INT DEFAULT 0 NOT NULL CHECK (total_xp >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Achievements table (predefined badges)
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT CHECK (category IN ('streak', 'completion', 'volume', 'special')) NOT NULL,
  xp_reward INT DEFAULT 0 NOT NULL CHECK (xp_reward >= 0),
  unlock_condition JSONB NOT NULL,
  display_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- User Achievements table (track unlocked badges)
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- AI Reports table
CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT CHECK (report_type IN ('weekly', 'monthly', 'insight', 'prediction', 'struggling')) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_ai_reports_user_id ON ai_reports(user_id);
CREATE INDEX idx_ai_reports_report_type ON ai_reports(report_type);
CREATE INDEX idx_ai_reports_generated_at ON ai_reports(generated_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- User Levels policies
CREATE POLICY "Users can view their own level"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own level"
  ON user_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level"
  ON user_levels FOR UPDATE
  USING (auth.uid() = user_id);

-- Achievements policies (public read, admin write)
CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  USING (true);

-- User Achievements policies
CREATE POLICY "Users can view their own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock their own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- AI Reports policies
CREATE POLICY "Users can view their own reports"
  ON ai_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON ai_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON ai_reports FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for user_levels updated_at
CREATE TRIGGER update_user_levels_updated_at
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user_level on first mandalart creation
CREATE OR REPLACE FUNCTION create_user_level_if_not_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_levels (user_id, level, total_xp)
  VALUES (NEW.user_id, 1, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create user level
CREATE TRIGGER auto_create_user_level
  AFTER INSERT ON mandalarts
  FOR EACH ROW
  EXECUTE FUNCTION create_user_level_if_not_exists();

-- Seed initial achievements
INSERT INTO achievements (key, title, description, icon, category, xp_reward, unlock_condition, display_order) VALUES
  ('streak_7', '🔥 일주일 불씨', '7일 연속 실천 달성', '🔥', 'streak', 100, '{"type": "streak", "days": 7}', 1),
  ('streak_30', '🔥 한 달 열정', '30일 연속 실천 달성', '🔥', 'streak', 500, '{"type": "streak", "days": 30}', 2),
  ('streak_100', '🔥 백일장', '100일 연속 실천 달성', '🔥', 'streak', 2000, '{"type": "streak", "days": 100}', 3),
  ('first_perfect_day', '⭐ 완벽한 하루', '하루 100% 완료 첫 달성', '⭐', 'completion', 50, '{"type": "perfect_day", "count": 1}', 4),
  ('perfect_week_3', '⭐ 모범생', '주간 80%+ 완료 3회 달성', '⭐', 'completion', 300, '{"type": "perfect_week", "count": 3, "threshold": 80}', 5),
  ('perfect_month', '⭐ 월간 우수상', '월간 90%+ 완료 달성', '⭐', 'completion', 800, '{"type": "perfect_month", "threshold": 90}', 6),
  ('checks_100', '💯 백발백중', '총 100회 실천 완료', '💯', 'volume', 200, '{"type": "total_checks", "count": 100}', 7),
  ('checks_500', '💯 오백나한', '총 500회 실천 완료', '💯', 'volume', 1000, '{"type": "total_checks", "count": 500}', 8),
  ('checks_1000', '💯 천수천안', '총 1000회 실천 완료', '💯', 'volume', 3000, '{"type": "total_checks", "count": 1000}', 9),
  ('balanced_goals', '🌟 균형잡힌 성장', '모든 서브골 60%+ 달성', '🌟', 'special', 500, '{"type": "balanced", "threshold": 60}', 10),
  ('early_bird', '🌅 아침형 인간', '오전 체크 비율 70%+', '🌅', 'special', 300, '{"type": "time_pattern", "period": "morning", "threshold": 70}', 11),
  ('weekend_warrior', '🏖️ 주말 전사', '주말 완료율이 평일보다 높음', '🏖️', 'special', 300, '{"type": "weekend_completion"}', 12);
