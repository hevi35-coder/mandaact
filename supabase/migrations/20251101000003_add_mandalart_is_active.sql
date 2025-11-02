-- Add is_active column to mandalarts table
-- This allows users to activate/deactivate mandalarts without deleting them

ALTER TABLE mandalarts
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for better query performance when filtering by is_active
CREATE INDEX idx_mandalarts_is_active ON mandalarts(user_id, is_active);

-- Comment for documentation
COMMENT ON COLUMN mandalarts.is_active IS 'Whether this mandalart is currently active. Inactive mandalarts are hidden from today''s checklist.';
