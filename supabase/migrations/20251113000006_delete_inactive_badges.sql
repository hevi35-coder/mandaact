-- ====================================
-- Delete Inactive Badges
-- ====================================
-- Created: 2025-11-13
-- Purpose: Remove 9 inactive badges (7 without RPC support + 2 deprecated)

-- Delete badges without RPC evaluation support
DELETE FROM achievements
WHERE key IN (
  'first_perfect_day',      -- No RPC support for perfect_day condition
  'perfect_week_3',          -- No RPC support for perfect_week condition
  'balanced_goals',          -- No RPC support for balanced condition
  'early_bird',              -- No RPC support for time_pattern condition
  'weekend_warrior',         -- No RPC support for weekend_completion condition
  'mandalart_50',            -- No RPC support for mandalart_completion condition
  'mandalart_100'            -- No RPC support for mandalart_completion condition
);

-- Delete deprecated badges
DELETE FROM achievements
WHERE key IN (
  'new_year_2025',           -- Event ended
  'monthly_perfect_3'        -- Too difficult (3 months at 100%)
);

-- Drop active_achievements view (depends on is_active column)
DROP VIEW IF EXISTS active_achievements;

-- Drop is_active column (no longer needed after cleanup)
ALTER TABLE achievements DROP COLUMN IF EXISTS is_active;
