-- Step 3: Update Existing Badges with Categories (Fixed)
-- Run this in Supabase Dashboard SQL Editor

-- Update existing badges
UPDATE achievements SET category = 'one_time', tier = 'bronze' WHERE key = 'first_check';
UPDATE achievements SET category = 'one_time', tier = 'silver' WHERE key = 'streak_7';
UPDATE achievements SET category = 'one_time', tier = 'silver' WHERE key = 'streak_30';
UPDATE achievements SET category = 'one_time', tier = 'gold' WHERE key = 'streak_60';
UPDATE achievements SET category = 'one_time', tier = 'platinum' WHERE key = 'streak_100';
UPDATE achievements SET category = 'one_time', tier = 'platinum' WHERE key = 'streak_150';
UPDATE achievements SET category = 'recurring', tier = 'gold', max_count = 999 WHERE key = 'perfect_day';
UPDATE achievements SET category = 'recurring', tier = 'gold', max_count = 999 WHERE key = 'checks_100';
UPDATE achievements SET category = 'recurring', tier = 'platinum', max_count = 999 WHERE key = 'checks_1000';

-- Insert new Phase 1 badges with unlock_condition
INSERT INTO achievements (
  key,
  title,
  description,
  icon,
  xp_reward,
  display_order,
  category,
  tier,
  unlock_condition,
  anti_cheat_rules
) VALUES
(
  'first_mandalart',
  '첫 걸음',
  '첫 번째 만다라트를 생성했습니다',
  '🌱',
  100,
  1,
  'one_time',
  'bronze',
  '{"type": "mandalart_created", "count": 1}'::jsonb,
  '{"minActionsPerMandalart": 16, "minActionTextLength": 5}'::jsonb
),
(
  'level_10',
  '성장하는 나무',
  '레벨 10을 달성했습니다',
  '📈',
  300,
  15,
  'one_time',
  'silver',
  '{"type": "level_reached", "level": 10}'::jsonb,
  NULL
),
(
  'monthly_champion',
  '월간 챔피언',
  '한 달 동안 100% 달성했습니다',
  '🏅',
  1000,
  20,
  'recurring',
  'gold',
  '{"type": "monthly_perfect", "percentage": 100}'::jsonb,
  '{"minActionsPerMandalart": 16, "minCheckInterval": 60, "maxDailyChecks": 50}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  unlock_condition = EXCLUDED.unlock_condition,
  anti_cheat_rules = EXCLUDED.anti_cheat_rules;

-- Verify updates
SELECT key, title, category, tier, max_count, unlock_condition
FROM achievements
ORDER BY display_order;

-- Success message
SELECT 'Step 3 Complete: Badges updated successfully' as status;