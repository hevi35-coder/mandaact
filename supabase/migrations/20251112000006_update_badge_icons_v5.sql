-- Badge System v5.0: Update badge icons for better semantic meaning
-- Migration: 20251112000006_update_badge_icons_v5.sql

-- 🌱 시작의 용기 (First Steps)
UPDATE achievements SET icon = '👣' WHERE key = 'first_check';
UPDATE achievements SET icon = '🧭' WHERE key = 'first_mandalart';

-- 🔥 시간의 여정 (Time Journey - Streak)
-- streak_3, streak_7, streak_14, streak_30, streak_60 keep 🔥
UPDATE achievements SET icon = '🔥' WHERE key = 'streak_100';
UPDATE achievements SET icon = '🔥' WHERE key = 'streak_150';

-- 💯 반복의 미학 (Art of Repetition - Volume)
-- checks_50, checks_100, checks_250 keep 💯
UPDATE achievements SET icon = '🦋' WHERE key = 'checks_500';
UPDATE achievements SET icon = '✨' WHERE key = 'checks_1000';
UPDATE achievements SET icon = '🏔️' WHERE key = 'checks_2500';
UPDATE achievements SET icon = '💫' WHERE key = 'checks_5000';

-- ⭐ 특별한 순간 (Special Moments)
UPDATE achievements SET icon = '⭐' WHERE key = 'perfect_day';
UPDATE achievements SET icon = '🌳' WHERE key = 'level_10';

-- 🏆 매달의 도전 (Monthly Challenge)
-- monthly_90_percent keeps 🏆
UPDATE achievements SET icon = '💯' WHERE key = 'monthly_perfect_week';
UPDATE achievements SET icon = '🏅' WHERE key = 'monthly_streak_30';
UPDATE achievements SET icon = '👑' WHERE key = 'monthly_champion';

-- 🌙 숨겨진 이야기 (Hidden Stories - Secret)
-- midnight_warrior keeps 🌙
UPDATE achievements SET icon = '🌈' WHERE key = 'mandalart_rainbow';
UPDATE achievements SET icon = '🦉' WHERE key = 'night_owl';
