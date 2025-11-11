-- Phase 2: Add 5 New Badges
-- Run this in Supabase Dashboard SQL Editor

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
),
-- 5. 대화의 달인 (AI 코칭 100회, 소셜)
(
  'ai_coach_100',
  '대화의 달인',
  'AI 코치와 100회 대화했습니다',
  '💭',
  600,
  29,
  'social',
  'gold',
  '{"type": "chat_count", "count": 100}'::jsonb,
  NULL
)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  tier = EXCLUDED.tier,
  unlock_condition = EXCLUDED.unlock_condition,
  anti_cheat_rules = EXCLUDED.anti_cheat_rules,
  description = EXCLUDED.description;

-- Verify insertions
SELECT key, title, category, tier, xp_reward
FROM achievements
WHERE key IN ('mandalart_50', 'mandalart_100', 'checks_100_v2', 'new_year_2025', 'ai_coach_100')
ORDER BY display_order;

-- Success message
SELECT 'Phase 2 Complete: 5 new badges added successfully' as status;