-- Step 1: Add Badge System Columns
-- Run this in Supabase Dashboard SQL Editor

-- Drop existing constraint
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_category_check;

-- Add columns to achievements table
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'one_time',
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS valid_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS anti_cheat_rules JSONB,
ADD COLUMN IF NOT EXISTS max_count INTEGER DEFAULT 1;

-- Add constraints
ALTER TABLE achievements
DROP CONSTRAINT IF EXISTS achievements_category_check,
ADD CONSTRAINT achievements_category_check
CHECK (category IN ('one_time', 'recurring', 'limited', 'hidden', 'social'));

ALTER TABLE achievements
DROP CONSTRAINT IF EXISTS achievements_tier_check,
ADD CONSTRAINT achievements_tier_check
CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- Add columns to user_achievements table
ALTER TABLE user_achievements
ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS authenticity_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;

-- Success message
SELECT 'Step 1 Complete: Badge columns added successfully' as status;