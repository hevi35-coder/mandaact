-- =====================================================
-- Timezone-Aware Report Scheduling
-- Created: 2025-12-18
-- Purpose: Generate reports at user's local time (12:00)
--          instead of fixed UTC time
-- =====================================================

-- =====================================================
-- 1. Update batch function to filter by user timezone
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
  v_weekly_reports INTEGER := 0;
  v_diagnosis_reports INTEGER := 0;
  v_errors_count INTEGER := 0;
  v_user_record RECORD;
  v_mandalart_record RECORD;
  v_week_start DATE;
  v_week_end DATE;
  v_user_local_time TIMESTAMP WITH TIME ZONE;
  v_user_local_hour INTEGER;
  v_user_local_day INTEGER;
BEGIN
  RAISE NOTICE 'Weekly report generation started at UTC: %', NOW();

  -- Find eligible users with active mandalarts
  FOR v_user_record IN
    SELECT DISTINCT
      u.id as user_id,
      u.email,
      COALESCE(up.timezone, 'Asia/Seoul') as user_timezone
    FROM auth.users u
    INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
    LEFT JOIN user_preferences up ON up.user_id = u.id
  LOOP
    BEGIN
      -- Calculate user's local time
      v_user_local_time := NOW() AT TIME ZONE v_user_record.user_timezone;
      v_user_local_hour := EXTRACT(HOUR FROM v_user_local_time);
      v_user_local_day := EXTRACT(DOW FROM v_user_local_time); -- 0=Sunday, 1=Monday

      -- Only process if it's Monday 12:00 in user's timezone
      -- We run every hour, so check if current hour is 12
      IF v_user_local_day = 1 AND v_user_local_hour = 12 THEN
        v_users_processed := v_users_processed + 1;

        -- Calculate date range: Previous Monday 00:00 to Previous Sunday 23:59 (user's timezone)
        v_week_end := (DATE(v_user_local_time) - INTERVAL '1 day')::DATE;
        v_week_start := v_week_end - INTERVAL '6 days';

        RAISE NOTICE 'Processing user % (timezone: %, local time: %, period: % to %)',
          v_user_record.user_id, v_user_record.user_timezone, v_user_local_time, v_week_start, v_week_end;

        -- =====================================================
        -- Generate Weekly Practice Report (if user has checks)
        -- =====================================================
        IF EXISTS (
          SELECT 1 FROM check_history ch
          WHERE ch.user_id = v_user_record.user_id
            AND DATE(ch.checked_at AT TIME ZONE v_user_record.user_timezone) >= v_week_start
            AND DATE(ch.checked_at AT TIME ZONE v_user_record.user_timezone) <= v_week_end
        ) THEN
          -- Check if weekly report already exists for this week
          IF NOT EXISTS (
            SELECT 1 FROM ai_reports
            WHERE user_id = v_user_record.user_id
              AND report_type = 'weekly'
              AND DATE(generated_at AT TIME ZONE v_user_record.user_timezone) >= v_week_start
          ) THEN
            INSERT INTO ai_reports (user_id, report_type, content, metadata, generated_at)
            VALUES (
              v_user_record.user_id,
              'weekly',
              '{"status": "pending", "scheduled_by": "cron"}',
              jsonb_build_object(
                'week_start', v_week_start,
                'week_end', v_week_end,
                'scheduled', true,
                'user_timezone', v_user_record.user_timezone
              ),
              NOW()
            );
            v_weekly_reports := v_weekly_reports + 1;
            RAISE NOTICE 'Weekly report scheduled for user: %', v_user_record.user_id;
          END IF;
        END IF;

        -- =====================================================
        -- Generate Goal Diagnosis Report
        -- =====================================================
        SELECT m.id, m.title INTO v_mandalart_record
        FROM mandalarts m
        WHERE m.user_id = v_user_record.user_id AND m.is_active = true
        ORDER BY m.created_at DESC
        LIMIT 1;

        IF v_mandalart_record.id IS NOT NULL THEN
          -- Check if diagnosis already exists for this week
          IF NOT EXISTS (
            SELECT 1 FROM ai_reports
            WHERE user_id = v_user_record.user_id
              AND report_type = 'diagnosis'
              AND DATE(generated_at AT TIME ZONE v_user_record.user_timezone) >= v_week_start
          ) THEN
            INSERT INTO ai_reports (user_id, report_type, content, metadata, generated_at)
            VALUES (
              v_user_record.user_id,
              'diagnosis',
              '{"status": "pending", "scheduled_by": "cron"}',
              jsonb_build_object(
                'mandalart_id', v_mandalart_record.id,
                'week_start', v_week_start,
                'week_end', v_week_end,
                'scheduled', true,
                'user_timezone', v_user_record.user_timezone
              ),
              NOW()
            );
            v_diagnosis_reports := v_diagnosis_reports + 1;
            RAISE NOTICE 'Diagnosis report scheduled for user: %', v_user_record.user_id;
          END IF;
        END IF;

      END IF; -- End timezone check

    EXCEPTION WHEN OTHERS THEN
      v_errors_count := v_errors_count + 1;
      RAISE WARNING 'Error processing user %: %', v_user_record.user_id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT
    v_users_processed,
    v_weekly_reports + v_diagnosis_reports,
    0::INTEGER, -- notifications handled by Edge Function
    v_errors_count,
    format('Weekly batch completed: %s users, %s weekly reports, %s diagnosis reports, %s errors',
           v_users_processed, v_weekly_reports, v_diagnosis_reports, v_errors_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Update wrapper function for new logic
-- =====================================================

-- Recreate wrapper to use new batch function
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

-- =====================================================
-- 3. Update cron schedule to run every hour
-- =====================================================

-- Remove existing schedules
SELECT cron.unschedule('weekly-report-generation');
SELECT cron.unschedule('weekly-report-generation-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report-generation-hourly');
SELECT cron.unschedule('weekly-report-generation-sunday') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-report-generation-sunday');

-- Run every hour on Monday to check each user's local time
SELECT cron.schedule(
  'weekly-report-generation-hourly',
  '0 * * * 1',
  'SELECT run_weekly_report_generation();'
);

-- Also run on Sunday evening for timezones ahead of UTC (Asia/Pacific)
SELECT cron.schedule(
  'weekly-report-generation-sunday',
  '0 15-23 * * 0',
  'SELECT run_weekly_report_generation();'
);

-- =====================================================
-- 4. Add comments
-- =====================================================

COMMENT ON FUNCTION generate_weekly_reports_batch() IS
  'Timezone-aware batch function: schedules reports for users at their local Monday 12:00 - called hourly by pg_cron';
COMMENT ON FUNCTION run_weekly_report_generation() IS
  'Wrapper for cron: generates timezone-aware weekly reports and triggers Edge Function';
