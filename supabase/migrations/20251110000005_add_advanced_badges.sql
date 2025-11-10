-- Add Advanced Badges: High-Difficulty + Secret Badges
-- Part of Badge System Expansion (Batch 2)

-- 1. Insert 5 high-difficulty badges (excluding existing ones: streak_100, checks_1000)
INSERT INTO achievements (key, title, description, icon, category, xp_reward, unlock_condition, display_order, hint_level, badge_type) VALUES
  -- High difficulty: Long streaks
  ('streak_60', '두 달의 열정', '60일 연속 실천 달성', '🔥', 'streak', 1500, '{"type": "streak", "days": 60}', 16, 'full', 'permanent'),
  ('streak_150', '불꽃의 제왕', '150일 연속 실천 달성', '🔥', 'streak', 3500, '{"type": "streak", "days": 150}', 17, 'full', 'permanent'),

  -- High difficulty: Volume
  ('checks_2500', '이천오백의 탑', '총 2500회 실천 완료', '💯', 'volume', 3500, '{"type": "total_checks", "count": 2500}', 18, 'full', 'permanent'),
  ('checks_5000', '만 번의 수련 (반)', '총 5000회 실천 완료', '💯', 'volume', 5000, '{"type": "total_checks", "count": 5000}', 19, 'full', 'permanent'),

  -- High difficulty: Perfect month milestone
  ('monthly_perfect_3', '석 달의 완벽', '월간 100% 완료를 3회 달성', '⭐', 'completion', 3000, '{"type": "perfect_month_count", "count": 3}', 20, 'full', 'permanent');

-- 2. Insert 3 secret badges (note: 'early_bird' and 'balanced_goals' already exist)
INSERT INTO achievements (key, title, description, icon, category, xp_reward, unlock_condition, display_order, hint_level, badge_type) VALUES
  -- Secret: Midnight checks (hidden)
  ('midnight_warrior', '???', '???', '🌙', 'special', 500, '{"type": "midnight_checks", "count": 30}', 21, 'hidden', 'permanent'),

  -- Secret: Balanced mandalart diversity per week (cryptic - different from balanced_goals)
  ('mandalart_rainbow', '무지개 실천', '여러 색깔의 목표를...', '🌈', 'special', 600, '{"type": "balanced_mandalart_week", "min_mandalarts": 3, "min_days": 7}', 22, 'cryptic', 'permanent'),

  -- Secret: Late night consistency (cryptic)
  ('night_owl', '올빼미의 습관', '밤의 시간을...', '🦉', 'special', 400, '{"type": "time_range_checks", "start_hour": 22, "end_hour": 24, "count": 50}', 23, 'cryptic', 'permanent');

-- 3. Add unlocked descriptions for secret badges (stored separately for reveal)
COMMENT ON COLUMN achievements.description IS 'Badge description shown before unlock. For hidden badges, shows "???" until unlocked';

-- We'll store unlocked descriptions in a separate JSONB field
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS unlocked_metadata JSONB DEFAULT '{}'::jsonb;

-- Update unlocked descriptions for secret badges
UPDATE achievements SET unlocked_metadata = jsonb_build_object(
  'unlocked_title', '자정의 전사',
  'unlocked_description', '자정(00:00-00:59)에 30회 체크 달성'
) WHERE key = 'midnight_warrior';

UPDATE achievements SET unlocked_metadata = jsonb_build_object(
  'unlocked_description', '한 주 동안 매일 최소 3개 이상의 서로 다른 만다라트 체크 달성'
) WHERE key = 'mandalart_rainbow';

UPDATE achievements SET unlocked_metadata = jsonb_build_object(
  'unlocked_description', '밤 10시-자정 사이 50회 체크 달성'
) WHERE key = 'night_owl';

-- 4. Add comments for new condition types
COMMENT ON FUNCTION evaluate_badge_progress IS 'Calculate real-time progress for badge unlock conditions. Supports types: total_checks, streak, monthly_completion, monthly_streak, perfect_week_in_month, perfect_month_count, midnight_checks, balanced_mandalart_week, time_range_checks';

-- 5. Create index for time-based queries (for time_range_checks and midnight_checks)
-- Note: EXTRACT is not IMMUTABLE, so we can't create a functional index on it
-- Instead, we rely on the existing idx_check_history_user_id and checked_at indexes
CREATE INDEX IF NOT EXISTS idx_check_history_user_time ON check_history(user_id, checked_at);
