-- Badge System Consolidation Migration
-- Purpose: Remove duplicate badges, deactivate unimplemented badges, unify schema
-- Date: 2025-11-12

-- ====================================
-- STEP 1: Remove Duplicate Badges (5 badges)
-- ====================================

-- Delete one_time versions of checks_100 and checks_1000 (keep recurring versions)
DELETE FROM achievements
WHERE key IN ('checks_100', 'checks_1000')
AND category = 'one_time';

-- Delete perfect_month (duplicate of monthly_90_percent)
DELETE FROM achievements WHERE key = 'perfect_month';

-- Delete deprecated recurring badges
DELETE FROM achievements WHERE key IN ('perfect_day', 'checks_100_v2');

-- ====================================
-- STEP 2: Deactivate Unimplemented Badges (10 badges)
-- ====================================

-- Add is_active column if it doesn't exist
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Deactivate badges without RPC support
UPDATE achievements SET is_active = FALSE
WHERE key IN (
  'first_perfect_day',      -- No RPC support for perfect_day condition
  'perfect_week_3',          -- No RPC support for perfect_week condition
  'balanced_goals',          -- No RPC support for balanced condition
  'early_bird',              -- No RPC support for time_pattern condition
  'weekend_warrior',         -- No RPC support for weekend_completion condition
  'mandalart_50',            -- No RPC support for mandalart_completion condition
  'mandalart_100',           -- No RPC support for mandalart_completion condition
  'new_year_2025',           -- Event ended
  'monthly_perfect_3'        -- Too difficult (3 months at 100%)
);

-- ====================================
-- STEP 3: Content Improvements
-- ====================================

-- Update midnight_warrior time range (00:00-00:59 → 23:00-01:00)
UPDATE achievements
SET
  unlock_condition = jsonb_set(
    jsonb_set(
      unlock_condition,
      '{start_hour}',
      '23'::jsonb
    ),
    '{end_hour}',
    '1'::jsonb
  ),
  description = '밤 11시-새벽 1시 사이 30회 체크 달성',
  unlocked_metadata = jsonb_build_object(
    'unlocked_title', '자정의 전사',
    'unlocked_description', '밤 11시-새벽 1시(23:00-01:00) 사이 30회 체크 달성'
  )
WHERE key = 'midnight_warrior';

-- Clarify streak_30 vs monthly_streak_30 descriptions
UPDATE achievements
SET description = '30일 연속 실천 달성 (언제든)'
WHERE key = 'streak_30';

UPDATE achievements
SET description = '매달 30일 연속 도전 (반복 획득 가능)'
WHERE key = 'monthly_streak_30';

-- Update night_owl unlocked description for consistency
UPDATE achievements
SET unlocked_metadata = jsonb_build_object(
  'unlocked_description', '밤 10시-자정 사이(22:00-24:00) 50회 체크 달성'
)
WHERE key = 'night_owl';

-- ====================================
-- STEP 4: Schema Unification (v2 → v4)
-- ====================================

-- Remove deprecated v2 fields
ALTER TABLE achievements DROP COLUMN IF EXISTS badge_type;
ALTER TABLE achievements DROP COLUMN IF EXISTS is_hidden;

-- Ensure category field uses v4 values
-- Valid categories: 'one_time', 'recurring', 'limited', 'hidden', 'social'
UPDATE achievements
SET category = CASE
  WHEN category IN ('streak', 'completion', 'volume', 'special') THEN 'one_time'
  WHEN category = 'milestone' AND is_repeatable = TRUE THEN 'recurring'
  WHEN category = 'milestone' AND is_repeatable = FALSE THEN 'one_time'
  ELSE category
END
WHERE category NOT IN ('one_time', 'recurring', 'limited', 'hidden', 'social');

-- ====================================
-- STEP 5: Update Badge Tier Consistency
-- ====================================

-- Fix tier values to use lowercase (bronze, silver, gold, platinum)
UPDATE achievements
SET tier = LOWER(tier)
WHERE tier != LOWER(tier);

-- ====================================
-- STEP 6: Add Indexes for Performance
-- ====================================

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active) WHERE is_active = TRUE;

-- Index on category for grouping
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);

-- ====================================
-- STEP 7: Create Badge System Views
-- ====================================

-- View for active badges only
CREATE OR REPLACE VIEW active_achievements AS
SELECT *
FROM achievements
WHERE is_active = TRUE OR is_active IS NULL
ORDER BY
  CASE tier
    WHEN 'bronze' THEN 1
    WHEN 'silver' THEN 2
    WHEN 'gold' THEN 3
    WHEN 'platinum' THEN 4
    ELSE 5
  END,
  xp_reward ASC;

-- Grant permissions
GRANT SELECT ON active_achievements TO authenticated;

-- ====================================
-- STEP 8: Migration Log
-- ====================================

CREATE TABLE IF NOT EXISTS badge_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  migration_name VARCHAR(100) NOT NULL,
  badges_deleted INTEGER,
  badges_deactivated INTEGER,
  notes TEXT
);

INSERT INTO badge_migration_log (migration_name, badges_deleted, badges_deactivated, notes)
VALUES (
  'badge_system_consolidation',
  5,  -- checks_100, checks_1000, perfect_month, perfect_day, checks_100_v2
  10, -- first_perfect_day, perfect_week_3, balanced_goals, early_bird, weekend_warrior, mandalart_50/100, new_year_2025, monthly_perfect_3
  'Removed duplicate badges, deactivated unimplemented badges, unified schema v2→v4, improved content (midnight_warrior time range, streak descriptions)'
);

-- ====================================
-- STEP 9: Add Comments
-- ====================================

COMMENT ON COLUMN achievements.is_active IS 'Badge activation status. FALSE = hidden from UI, pending RPC implementation';
COMMENT ON VIEW active_achievements IS 'All active badges sorted by tier and XP';
COMMENT ON TABLE badge_migration_log IS 'History of badge system migrations';

-- ====================================
-- FINAL BADGE COUNT VERIFICATION
-- ====================================

-- Total badges: 33 - 5 deleted = 28 remaining
-- Active badges: 28 - 10 deactivated = 18 active

DO $$
DECLARE
  v_total_count INTEGER;
  v_active_count INTEGER;
  v_deleted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM achievements;
  SELECT COUNT(*) INTO v_active_count FROM achievements WHERE is_active = TRUE OR is_active IS NULL;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Badge System Consolidation Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total badges: %', v_total_count;
  RAISE NOTICE 'Active badges: %', v_active_count;
  RAISE NOTICE 'Deactivated badges: %', v_total_count - v_active_count;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Removed 5 duplicate badges';
  RAISE NOTICE '  - Deactivated 10 unimplemented badges';
  RAISE NOTICE '  - Improved midnight_warrior time range (23:00-01:00)';
  RAISE NOTICE '  - Clarified streak badge descriptions';
  RAISE NOTICE '  - Unified schema (v2 → v4)';
  RAISE NOTICE '==============================================';
END $$;
