-- Migration: Add coaching_session_id to mandalarts
-- Created at: 2026-01-03

ALTER TABLE mandalarts ADD COLUMN IF NOT EXISTS coaching_session_id UUID REFERENCES coaching_sessions(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_mandalarts_coaching_session_id ON mandalarts(coaching_session_id);
