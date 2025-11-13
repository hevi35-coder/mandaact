-- ====================================
-- Delete Special, Monthly, and Secret Badge Categories
-- ====================================
-- Created: 2025-11-13
-- Purpose: Remove "특별한 순간", "매달의 도전", "숨겨진 이야기" categories

-- Delete "특별한 순간" (성취 배지)
DELETE FROM achievements
WHERE key IN (
  'perfect_day',             -- 오늘의 완성
  'level_10'                 -- 성장의 나무
);

-- Delete "매달의 도전" (월간 챌린지)
DELETE FROM achievements
WHERE key IN (
  'monthly_90_percent',      -- 이달의 주인공
  'monthly_perfect_week',    -- 완벽한 주
  'monthly_streak_30',       -- 월간 마라톤
  'monthly_champion'         -- 월간 그랜드슬램
);

-- Delete "숨겨진 이야기" (시크릿 배지)
DELETE FROM achievements
WHERE key IN (
  'midnight_warrior',        -- 심야의 수행자
  'mandalart_rainbow',       -- 무지개 균형
  'night_owl'                -- 올빼미 집중
);
