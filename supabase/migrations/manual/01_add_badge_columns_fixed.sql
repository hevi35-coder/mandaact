-- Step 1: Add Badge System Columns (Fixed Version)
-- Run this in Supabase Dashboard SQL Editor

-- Drop existing constraint first
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_category_check;
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_tier_check;

-- Add columns WITHOUT constraints first
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'one_time',
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS anti_cheat_rules JSONB,
ADD COLUMN IF NOT EXISTS max_count INTEGER DEFAULT 1;

-- Update any NULL or invalid values to valid defaults
UPDATE achievements
SET category = 'one_time'
WHERE category IS NULL OR category NOT IN ('one_time', 'recurring', 'limited', 'hidden', 'social');

UPDATE achievements
SET tier = 'bronze'
WHERE tier IS NULL OR tier NOT IN ('bronze', 'silver', 'gold', 'platinum');

-- Now add constraints after data is clean
ALTER TABLE achievements
ADD CONSTRAINT achievements_category_check
CHECK (category IN ('one_time', 'recurring', 'limited', 'hidden', 'social'));

ALTER TABLE achievements
ADD CONSTRAINT achievements_tier_check
CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Add columns to user_achievements table
ALTER TABLE user_achievements
ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS authenticity_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;

-- Verify the changes
SELECT key, title, category, tier
FROM achievements
ORDER BY display_order;

-- Success message
SELECT 'Step 1 Complete: Badge columns added successfully' as status;