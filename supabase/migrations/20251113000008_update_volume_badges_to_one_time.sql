-- ====================================
-- Update Volume Badges - Change to One-Time
-- ====================================
-- Created: 2025-11-13
-- Purpose: Change checks_100 and checks_1000 from recurring to one_time

-- Update 백 번의 실천: recurring → one_time
UPDATE achievements
SET category = 'one_time'
WHERE key = 'checks_100';

-- Update 천 번의 통찰: recurring → one_time
UPDATE achievements
SET category = 'one_time'
WHERE key = 'checks_1000';
