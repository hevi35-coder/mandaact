-- =====================================================
-- Auto-Trigger Scheduled Reports Edge Function
-- Created: 2025-12-18
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trigger_scheduled_report_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url TEXT;
  v_service_role_key TEXT;
  v_response_id BIGINT;
BEGIN
  v_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/scheduled-report';
  v_service_role_key := current_setting('app.settings.supabase_service_role_key', true);

  IF v_function_url IS NULL OR v_service_role_key IS NULL THEN
    SELECT
      'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co/functions/v1/scheduled-report',
      current_setting('app.settings.supabase_service_role_key', true)
    INTO v_function_url, v_service_role_key;
  END IF;

  SELECT net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'triggered_by', 'pg_cron',
      'triggered_at', NOW()
    )
  ) INTO v_response_id;

  RAISE NOTICE 'Scheduled report Edge Function triggered, request_id: %', v_response_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to trigger scheduled-report Edge Function: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_scheduled_report_generation() TO postgres;

-- =====================================================
-- Wrapper functions for cron jobs (avoids dollar-quote issues)
-- =====================================================

CREATE OR REPLACE FUNCTION run_weekly_report_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM generate_weekly_reports_batch();
  PERFORM trigger_scheduled_report_generation();
END;
$$;

CREATE OR REPLACE FUNCTION process_pending_reports_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_pending_count
  FROM ai_reports
  WHERE content LIKE '%"status": "pending"%'
    AND generated_at > NOW() - INTERVAL '24 hours';

  IF v_pending_count > 0 THEN
    RAISE NOTICE 'Found % pending reports, triggering Edge Function', v_pending_count;
    PERFORM trigger_scheduled_report_generation();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION run_weekly_report_generation() TO postgres;
GRANT EXECUTE ON FUNCTION process_pending_reports_check() TO postgres;

-- =====================================================
-- Update cron schedules
-- =====================================================

SELECT cron.unschedule('weekly-report-generation');

SELECT cron.schedule(
  'weekly-report-generation',
  '0 3 * * 1',
  'SELECT run_weekly_report_generation();'
);

SELECT cron.schedule(
  'process-pending-reports',
  '0 * * * *',
  'SELECT process_pending_reports_check();'
);

COMMENT ON FUNCTION trigger_scheduled_report_generation() IS
  'Triggers scheduled-report Edge Function via HTTP to process pending reports';
COMMENT ON FUNCTION run_weekly_report_generation() IS
  'Wrapper for cron: generates weekly reports and triggers Edge Function';
COMMENT ON FUNCTION process_pending_reports_check() IS
  'Wrapper for cron: checks and processes pending reports every hour';
