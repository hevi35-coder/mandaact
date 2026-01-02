-- Add emergency_action column to mandalarts table to support AI Safety Net feature
ALTER TABLE mandalarts ADD COLUMN IF NOT EXISTS emergency_action TEXT;

COMMENT ON COLUMN mandalarts.emergency_action IS 'The single most important action to do on "worst days", as identified by AI coaching.';
