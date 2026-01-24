-- Migration: Add description fields for dual-text architecture
-- Created at: 2026-01-09
-- Purpose: Store both summary (title) and detailed (description) versions of goals and actions

-- 1. Add description field to mandalarts table
ALTER TABLE mandalarts ADD COLUMN IF NOT EXISTS description TEXT;
COMMENT ON COLUMN mandalarts.description IS 'Detailed explanation of center_goal for coaching preview';

-- 2. Add description field to sub_goals table
ALTER TABLE sub_goals ADD COLUMN IF NOT EXISTS description TEXT;
COMMENT ON COLUMN sub_goals.description IS 'Detailed explanation of sub-goal for coaching preview';

-- 3. Add description field to actions table
ALTER TABLE actions ADD COLUMN IF NOT EXISTS description TEXT;
COMMENT ON COLUMN actions.description IS 'Detailed explanation of action for coaching preview';

-- 4. Migrate existing data: Copy title to description for consistency
-- This ensures existing coaching-created items have the full text in description
UPDATE mandalarts 
SET description = center_goal 
WHERE description IS NULL AND input_method = 'coaching';

UPDATE sub_goals sg
SET description = sg.title
WHERE sg.description IS NULL 
  AND EXISTS (
    SELECT 1 FROM mandalarts m 
    WHERE m.id = sg.mandalart_id 
    AND m.input_method = 'coaching'
  );

UPDATE actions a
SET description = a.title
WHERE a.description IS NULL
  AND EXISTS (
    SELECT 1 FROM sub_goals sg
    JOIN mandalarts m ON m.id = sg.mandalart_id
    WHERE sg.id = a.sub_goal_id
    AND m.input_method = 'coaching'
  );
