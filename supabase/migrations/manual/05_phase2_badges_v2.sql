-- Phase 2: Add 4 New Badges (Updated)
-- Run this in Supabase Dashboard SQL Editor
-- Note: AI Coach badge (대화의 달인) excluded due to missing chat tables

-- Insert Phase 2 badges
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
-- 1. 집중력 (한 만다라트 50% 완성)
(
  'mandalart_50',
  '집중력',
  '한 만다라트를 50% 이상 완성했습니다',
  '🎯',
  400,
  25,
  'one_time',
  'silver',
  '{"type": "mandalart_completion", "percentage": 50}'::jsonb,
  NULL
),
-- 2. 완벽주의자 (한 만다라트 100% 완성)
(
  'mandalart_100',
  '완벽주의자',
  '한 만다라트를 100% 완성했습니다',
  '🏆',
  800,
  26,
  'one_time',
  'gold',
  '{"type": "mandalart_completion", "percentage": 100}'::jsonb,
  NULL
),
-- 3. 100의 힘 (누적 100회 실천, 반복 획득)
(
  'checks_100_v2',
  '100의 힘',
  '누적 100회 실천을 달성했습니다',
  '💪',
  200,
  27,
  'recurring',
  'silver',
  '{"type": "total_checks_milestone", "count": 100}'::jsonb,
  NULL
),
-- 4. 새해의 다짐 (1월 1-7일 100% 달성, 한정판)
(
  'new_year_2025',
  '새해의 다짐',
  '새해 첫 주를 100% 달성했습니다',
  '🎆',
  1500,
  28,
  'limited',
  'platinum',
  '{"type": "period_perfect", "start_date": "2025-01-01", "end_date": "2025-01-07", "percentage": 100}'::jsonb,
  '{"minActionsPerMandalart": 16}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  unlock_condition = EXCLUDED.unlock_condition,
  anti_cheat_rules = EXCLUDED.anti_cheat_rules,
  description = EXCLUDED.description;

-- Set valid dates for limited edition badge
UPDATE achievements
SET
  valid_from = '2025-01-01 00:00:00',
  valid_until = '2025-01-07 23:59:59'
WHERE key = 'new_year_2025';

-- Verify insertions
SELECT key, title, category, tier, xp_reward, valid_from, valid_until
FROM achievements
WHERE key IN ('mandalart_50', 'mandalart_100', 'checks_100_v2', 'new_year_2025')
ORDER BY display_order;

-- Success message
SELECT 'Phase 2 Complete: 4 badges added successfully (AI coach badge skipped)' as status;