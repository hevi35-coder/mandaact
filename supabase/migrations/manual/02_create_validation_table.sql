-- Step 2: Create Badge Validation Logs Table
-- Run this in Supabase Dashboard SQL Editor

-- Create table
CREATE TABLE IF NOT EXISTS badge_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key VARCHAR(50) NOT NULL,
  validation_type VARCHAR(20) NOT NULL,
  passed BOOLEAN NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_badge_validation_logs_user_id ON badge_validation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_validation_logs_created_at ON badge_validation_logs(created_at);

-- Enable RLS
ALTER TABLE badge_validation_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view their own validation logs" ON badge_validation_logs;
CREATE POLICY "Users can view their own validation logs"
  ON badge_validation_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert validation logs" ON badge_validation_logs;
CREATE POLICY "System can insert validation logs"
  ON badge_validation_logs FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON badge_validation_logs TO authenticated;

-- Success message
SELECT 'Step 2 Complete: Validation logs table created successfully' as status;