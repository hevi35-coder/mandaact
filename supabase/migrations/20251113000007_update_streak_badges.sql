-- ====================================
-- Update Streak Badges - "시간의 여정" (7개 → 6개)
-- ====================================
-- Created: 2025-11-13
-- Purpose: Delete streak_150 and update streak_100 to become the master tier

-- Delete 150일의 마스터
DELETE FROM achievements WHERE key = 'streak_150';

-- Update 100일의 증명 → 100일의 마스터
UPDATE achievements
SET
  title = '100일의 마스터',
  title_en = 'Hundred Master',
  description = '습관을 넘어 삶의 일부가 되다'
WHERE key = 'streak_100';
