-- Migration: Add variant to actions and current_plan_mode to mandalarts
-- Created at: 2025-12-26

-- Add variant column to actions
ALTER TABLE actions ADD COLUMN IF NOT EXISTS variant TEXT CHECK (variant IN ('base', 'minimum', 'challenge', 'extra'));
COMMENT ON COLUMN actions.variant IS 'Variant type for AI coaching: base (기본), minimum (최소), challenge (도전), extra (추가)';

-- Add current_plan_mode to mandalarts
ALTER TABLE mandalarts ADD COLUMN IF NOT EXISTS current_plan_mode TEXT DEFAULT 'base' CHECK (current_plan_mode IN ('base', 'minimum', 'challenge'));
COMMENT ON COLUMN mandalarts.current_plan_mode IS 'Currently active plan mode for the mandalart';

-- Update existing actions to 'base' if they don't have a variant
UPDATE actions SET variant = 'base' WHERE variant IS NULL;
