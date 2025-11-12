-- XP Anti-Cheat System
-- Prevents XP abuse through check/uncheck spam and rapid checking

-- Create table for tracking daily check limits per action
CREATE TABLE IF NOT EXISTS check_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  check_count INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, action_id, check_date)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_check_limits_user_date ON check_limits(user_id, check_date);
CREATE INDEX IF NOT EXISTS idx_check_limits_action_date ON check_limits(action_id, check_date);

-- RLS Policies
ALTER TABLE check_limits ENABLE ROW LEVEL SECURITY;

-- Users can read their own check limits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'check_limits'
    AND policyname = 'Users can view their own check limits'
  ) THEN
    CREATE POLICY "Users can view their own check limits"
      ON check_limits
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- System can insert/update check limits (service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'check_limits'
    AND policyname = 'Service role can manage check limits'
  ) THEN
    CREATE POLICY "Service role can manage check limits"
      ON check_limits
      FOR ALL
      USING (true);
  END IF;
END $$;

-- Create function to validate and record check with anti-cheat
CREATE OR REPLACE FUNCTION validate_and_record_check(
  p_user_id UUID,
  p_action_id UUID,
  p_checked_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_check_date DATE;
  v_current_count INTEGER;
  v_last_checked_at TIMESTAMPTZ;
  v_time_since_last_check INTEGER;
  v_rapid_checks_count INTEGER;
  v_allowed BOOLEAN := TRUE;
  v_reason TEXT := '';
  v_result JSONB;
BEGIN
  -- Convert to KST date
  v_check_date := DATE(p_checked_at AT TIME ZONE 'Asia/Seoul');

  -- Get current check limit record
  SELECT check_count, last_checked_at
  INTO v_current_count, v_last_checked_at
  FROM check_limits
  WHERE user_id = p_user_id
    AND action_id = p_action_id
    AND check_date = v_check_date;

  -- Initialize if not exists
  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;

  -- Rule 1: Max 3 checks per action per day
  -- Allows: check → uncheck → check (once retry allowed)
  IF v_current_count >= 3 THEN
    v_allowed := FALSE;
    v_reason := 'daily_limit_exceeded';
  END IF;

  -- Rule 2: Minimum 10 seconds between checks for same action
  IF v_last_checked_at IS NOT NULL THEN
    v_time_since_last_check := EXTRACT(EPOCH FROM (p_checked_at - v_last_checked_at))::INTEGER;

    IF v_time_since_last_check < 10 THEN
      v_allowed := FALSE;
      v_reason := 'too_fast_recheck';
    END IF;
  END IF;

  -- Rule 3: Check for rapid checking pattern (multiple actions)
  -- Count checks in last 5 seconds across all actions
  SELECT COUNT(*) INTO v_rapid_checks_count
  FROM check_history
  WHERE user_id = p_user_id
    AND checked_at > p_checked_at - INTERVAL '5 seconds';

  IF v_rapid_checks_count >= 10 THEN
    v_allowed := FALSE;
    v_reason := 'rapid_spam_detected';
  END IF;

  -- Update check limit record
  IF v_allowed THEN
    INSERT INTO check_limits (user_id, action_id, check_date, check_count, last_checked_at)
    VALUES (p_user_id, p_action_id, v_check_date, 1, p_checked_at)
    ON CONFLICT (user_id, action_id, check_date)
    DO UPDATE SET
      check_count = check_limits.check_count + 1,
      last_checked_at = p_checked_at,
      updated_at = NOW();
  END IF;

  -- Return result
  v_result := jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'check_count', v_current_count + 1,
    'time_since_last_check', v_time_since_last_check
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_and_record_check TO authenticated;

-- Create function to clean up old check limits (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_old_check_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM check_limits
  WHERE check_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_old_check_limits() TO service_role;

-- Add comments
COMMENT ON TABLE check_limits IS 'Tracks check frequency per action per day to prevent XP abuse';
COMMENT ON FUNCTION validate_and_record_check IS 'Validates check attempt against anti-cheat rules and records check limit';
COMMENT ON FUNCTION cleanup_old_check_limits IS 'Removes check limit records older than 30 days';
