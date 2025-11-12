-- XP Multiplier System
-- Create table for tracking user bonus XP multipliers

CREATE TABLE IF NOT EXISTS user_bonus_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('weekend', 'comeback', 'level_milestone', 'perfect_week')),
  multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.0,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_bonus_xp_user_id ON user_bonus_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bonus_xp_expires ON user_bonus_xp(user_id, bonus_type, expires_at);

-- RLS Policies
ALTER TABLE user_bonus_xp ENABLE ROW LEVEL SECURITY;

-- Users can read their own bonus XP records
CREATE POLICY "Users can view their own bonus XP"
  ON user_bonus_xp
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert bonus XP records (service role)
CREATE POLICY "Service role can insert bonus XP"
  ON user_bonus_xp
  FOR INSERT
  WITH CHECK (true);

-- System can update bonus XP records (service role)
CREATE POLICY "Service role can update bonus XP"
  ON user_bonus_xp
  FOR UPDATE
  USING (true);

-- System can delete expired bonus XP records (service role)
CREATE POLICY "Service role can delete bonus XP"
  ON user_bonus_xp
  FOR DELETE
  USING (true);

-- Create function to clean up expired bonuses (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_bonuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_bonus_xp
  WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep for 7 days after expiry for audit
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_expired_bonuses() TO service_role;

-- Add comment
COMMENT ON TABLE user_bonus_xp IS 'Tracks temporary XP multiplier bonuses for users';
COMMENT ON COLUMN user_bonus_xp.bonus_type IS 'Type of bonus: weekend, comeback, level_milestone, perfect_week';
COMMENT ON COLUMN user_bonus_xp.multiplier IS 'XP multiplier value (1.5 = 50% bonus, 2.0 = 100% bonus)';
COMMENT ON COLUMN user_bonus_xp.metadata IS 'Additional metadata (e.g., level for milestone bonus)';
