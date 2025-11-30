-- =====================================================
-- Update Weekly Report Cron Time
-- Created: 2025-11-30
-- Purpose: Change from Monday 06:00 KST to Monday 12:00 KST
-- =====================================================

-- Remove old schedule
SELECT cron.unschedule('weekly-report-generation');

-- Create new schedule: Monday 12:00 KST = Monday 03:00 UTC
SELECT cron.schedule(
  'weekly-report-generation',
  '0 3 * * 1',  -- Every Monday at 03:00 UTC = Monday 12:00 KST
  $$SELECT generate_weekly_reports_batch()$$
);

COMMENT ON FUNCTION generate_weekly_reports_batch() IS 'Batch function to schedule weekly reports, called by pg_cron every Monday 12:00 KST';
