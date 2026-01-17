-- Migration: Mandalart Draft System
-- Created at: 2026-01-09
-- Purpose: Enable hybrid auto-save with user edit preservation

-- 1. Add status field to mandalarts (draft vs completed)
ALTER TABLE mandalarts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
COMMENT ON COLUMN mandalarts.status IS 'draft = in-progress coaching, completed = finished';

-- 2. Add user edit tracking to sub_goals
ALTER TABLE sub_goals ADD COLUMN IF NOT EXISTS is_user_edited BOOLEAN DEFAULT false;
COMMENT ON COLUMN sub_goals.is_user_edited IS 'True if user manually edited this item (protected from AI overwrite)';

-- 3. Add user edit tracking to actions
ALTER TABLE actions ADD COLUMN IF NOT EXISTS is_user_edited BOOLEAN DEFAULT false;
COMMENT ON COLUMN actions.is_user_edited IS 'True if user manually edited this item (protected from AI overwrite)';

-- 4. Ensure existing mandalarts are marked as completed
UPDATE mandalarts SET status = 'completed' WHERE status IS NULL;

-- 5. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mandalarts_status ON mandalarts(status);
CREATE INDEX IF NOT EXISTS idx_mandalarts_coaching_session ON mandalarts(coaching_session_id) WHERE coaching_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_goals_user_edited ON sub_goals(mandalart_id) WHERE is_user_edited = true;
