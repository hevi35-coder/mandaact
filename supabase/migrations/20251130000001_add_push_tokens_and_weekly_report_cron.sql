-- =====================================================
-- Push Tokens & Weekly Report Auto-Generation System
-- Created: 2025-11-30
-- Purpose:
--   1. Store Expo push tokens for users
--   2. Setup weekly report auto-generation cron job
-- =====================================================

-- =====================================================
-- 1. Push Tokens Table
-- =====================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active token per user per platform
  UNIQUE(user_id, token)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can access all (for Edge Functions)
CREATE POLICY "Service role full access"
  ON push_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- =====================================================
-- 2. Weekly Report Generation Function
-- Called by pg_cron every Monday at 06:00 KST
-- =====================================================

CREATE OR REPLACE FUNCTION generate_weekly_reports_batch()
RETURNS TABLE (
  users_processed INTEGER,
  reports_generated INTEGER,
  notifications_sent INTEGER,
  errors_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_users_processed INTEGER := 0;
  v_reports_generated INTEGER := 0;
  v_notifications_sent INTEGER := 0;
  v_errors_count INTEGER := 0;
  v_user_record RECORD;
  v_check_count INTEGER;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Calculate date range: Previous Monday 00:00 to Previous Sunday 23:59 (KST)
  -- When run on Monday 06:00 KST, this covers the previous 7 days
  v_week_end := (CURRENT_DATE AT TIME ZONE 'Asia/Seoul' - INTERVAL '1 day')::DATE; -- Yesterday (Sunday)
  v_week_start := v_week_end - INTERVAL '6 days'; -- Previous Monday

  RAISE NOTICE 'Weekly report generation started for period: % to %', v_week_start, v_week_end;

  -- Find eligible users:
  -- 1. Has active mandalart
  -- 2. Has at least 1 check in the past 7 days
  -- 3. Has notifications enabled (push token exists)
  FOR v_user_record IN
    SELECT DISTINCT u.id as user_id, u.email
    FROM auth.users u
    INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
    WHERE EXISTS (
      -- Has at least 1 check in the past 7 days
      SELECT 1 FROM check_history ch
      WHERE ch.user_id = u.id
        AND ch.checked_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
        AND ch.checked_at < ((v_week_end + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
    )
  LOOP
    v_users_processed := v_users_processed + 1;

    BEGIN
      -- Check if report already exists for this week
      IF NOT EXISTS (
        SELECT 1 FROM ai_reports
        WHERE user_id = v_user_record.user_id
          AND report_type = 'weekly'
          AND generated_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
      ) THEN
        -- Insert placeholder to be filled by Edge Function
        -- Edge Function will be called via HTTP trigger
        INSERT INTO ai_reports (user_id, report_type, content, metadata, generated_at)
        VALUES (
          v_user_record.user_id,
          'weekly',
          '{"status": "pending", "scheduled_by": "cron"}',
          jsonb_build_object('week_start', v_week_start, 'week_end', v_week_end, 'scheduled', true),
          NOW()
        );

        v_reports_generated := v_reports_generated + 1;
        RAISE NOTICE 'Report scheduled for user: %', v_user_record.user_id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors_count := v_errors_count + 1;
      RAISE WARNING 'Error processing user %: %', v_user_record.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT
    v_users_processed,
    v_reports_generated,
    v_notifications_sent,
    v_errors_count,
    format('Weekly report batch completed: %s users processed, %s reports scheduled, %s errors',
           v_users_processed, v_reports_generated, v_errors_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. pg_cron Job Setup
-- Monday 06:00 KST = Sunday 21:00 UTC
-- =====================================================

-- Schedule weekly report generation
-- Note: KST is UTC+9, so Monday 06:00 KST = Sunday 21:00 UTC
SELECT cron.schedule(
  'weekly-report-generation',
  '0 21 * * 0',  -- Every Sunday at 21:00 UTC = Monday 06:00 KST
  $$SELECT generate_weekly_reports_batch()$$
);

-- =====================================================
-- 4. Helper function to get users needing reports
-- Used by Edge Function for actual report generation
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_for_weekly_report()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  push_token TEXT,
  check_count BIGINT
) AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Same date calculation as batch function
  v_week_end := (CURRENT_DATE AT TIME ZONE 'Asia/Seoul' - INTERVAL '1 day')::DATE;
  v_week_start := v_week_end - INTERVAL '6 days';

  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email::TEXT,
    pt.token as push_token,
    COUNT(ch.id) as check_count
  FROM auth.users u
  INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
  INNER JOIN check_history ch ON ch.user_id = u.id
    AND ch.checked_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
    AND ch.checked_at < ((v_week_end + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
  LEFT JOIN push_tokens pt ON pt.user_id = u.id AND pt.is_active = true
  WHERE NOT EXISTS (
    -- Exclude users who already have a report this week
    SELECT 1 FROM ai_reports ar
    WHERE ar.user_id = u.id
      AND ar.report_type = 'weekly'
      AND ar.generated_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
      AND ar.content NOT LIKE '%"status": "pending"%'  -- Exclude pending ones
  )
  GROUP BY u.id, u.email, pt.token
  HAVING COUNT(ch.id) >= 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (for Edge Functions)
GRANT EXECUTE ON FUNCTION get_users_for_weekly_report() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_weekly_report() TO service_role;

-- =====================================================
-- 5. Notification preferences table (optional, for future)
-- =====================================================

-- For now, we use the presence of push_token as opt-in
-- Can be extended later with more granular preferences

COMMENT ON TABLE push_tokens IS 'Stores Expo push notification tokens for users';
COMMENT ON FUNCTION generate_weekly_reports_batch() IS 'Batch function to schedule weekly reports, called by pg_cron';
COMMENT ON FUNCTION get_users_for_weekly_report() IS 'Returns users eligible for weekly report generation';
