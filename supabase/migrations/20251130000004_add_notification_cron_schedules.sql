-- =====================================================
-- Notification Cron Schedules
-- Created: 2025-11-30
-- Purpose: Add pg_cron schedules for streak-warning and comeback-notification
--
-- Note: These cron jobs call Edge Functions via pg_net extension.
-- The Edge Functions handle the actual notification logic.
-- =====================================================

-- =====================================================
-- Helper function to call Edge Functions via pg_net
-- Uses Supabase's pg_net extension for HTTP requests
-- =====================================================

CREATE OR REPLACE FUNCTION call_edge_function(function_name TEXT)
RETURNS VOID AS $$
DECLARE
  v_request_id BIGINT;
BEGIN
  -- Call Edge Function via pg_net
  -- Uses x-cron-secret header for authentication (set via Supabase secrets)
  SELECT net.http_post(
    url := 'https://gxnvovnwlqjstpcsprqr.supabase.co/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  ) INTO v_request_id;

  RAISE NOTICE 'Edge Function % called, request_id: %', function_name, v_request_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail - cron should continue
  RAISE WARNING 'Failed to call Edge Function %: %', function_name, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Streak Warning Cron Job
-- Schedule: Every day at 21:00 KST = 12:00 UTC
-- =====================================================

-- Create wrapper function for cron
CREATE OR REPLACE FUNCTION trigger_streak_warning_notification()
RETURNS VOID AS $$
BEGIN
  PERFORM call_edge_function('streak-warning');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job
DO $$
BEGIN
  -- Unschedule if exists
  PERFORM cron.unschedule('streak-warning-notification');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist, that's fine
  NULL;
END $$;

SELECT cron.schedule(
  'streak-warning-notification',
  '0 12 * * *',  -- Every day at 12:00 UTC = 21:00 KST
  $$SELECT trigger_streak_warning_notification()$$
);

-- =====================================================
-- Comeback Notification Cron Job
-- Schedule: Every day at 19:00 KST = 10:00 UTC
-- =====================================================

-- Create wrapper function for cron
CREATE OR REPLACE FUNCTION trigger_comeback_notification()
RETURNS VOID AS $$
BEGIN
  PERFORM call_edge_function('comeback-notification');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job
DO $$
BEGIN
  -- Unschedule if exists
  PERFORM cron.unschedule('comeback-notification');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist, that's fine
  NULL;
END $$;

SELECT cron.schedule(
  'comeback-notification',
  '0 10 * * *',  -- Every day at 10:00 UTC = 19:00 KST
  $$SELECT trigger_comeback_notification()$$
);

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON FUNCTION call_edge_function(TEXT) IS 'Helper function to call Edge Functions via pg_net';
COMMENT ON FUNCTION trigger_streak_warning_notification() IS 'Wrapper function for streak-warning cron job - runs daily at 21:00 KST';
COMMENT ON FUNCTION trigger_comeback_notification() IS 'Wrapper function for comeback-notification cron job - runs daily at 19:00 KST';
