-- =====================================================
-- Weekly Goal Diagnosis Auto-Generation
-- Created: 2025-12-08
-- Purpose: Add Goal Diagnosis to weekly auto-generation
--          alongside Practice Report on Mondays
-- =====================================================

-- =====================================================
-- 1. Update generate_weekly_reports_batch() to also
--    create diagnosis placeholder reports
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
BEGIN
  -- Calculate date range: Previous Monday 00:00 to Previous Sunday 23:59 (KST)
  v_week_end := (CURRENT_DATE AT TIME ZONE 'Asia/Seoul' - INTERVAL '1 day')::DATE;
  v_week_start := v_week_end - INTERVAL '6 days';

  RAISE NOTICE 'Weekly report generation started for period: % to %', v_week_start, v_week_end;

  -- Find eligible users with active mandalarts
  FOR v_user_record IN
    SELECT DISTINCT u.id as user_id, u.email
    FROM auth.users u
    INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
  LOOP
    v_users_processed := v_users_processed + 1;

    BEGIN
      -- =====================================================
      -- Generate Weekly Practice Report (if user has checks)
      -- =====================================================
      IF EXISTS (
        SELECT 1 FROM check_history ch
        WHERE ch.user_id = v_user_record.user_id
          AND ch.checked_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
          AND ch.checked_at < ((v_week_end + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
      ) THEN
        -- Check if weekly report already exists for this week
        IF NOT EXISTS (
          SELECT 1 FROM ai_reports
          WHERE user_id = v_user_record.user_id
            AND report_type = 'weekly'
            AND generated_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
        ) THEN
          INSERT INTO ai_reports (user_id, report_type, content, metadata, generated_at)
          VALUES (
            v_user_record.user_id,
            'weekly',
            '{"status": "pending", "scheduled_by": "cron"}',
            jsonb_build_object('week_start', v_week_start, 'week_end', v_week_end, 'scheduled', true),
            NOW()
          );
          v_weekly_reports := v_weekly_reports + 1;
          RAISE NOTICE 'Weekly report scheduled for user: %', v_user_record.user_id;
        END IF;
      END IF;

      -- =====================================================
      -- Generate Goal Diagnosis Report
      -- Check if diagnosis should be regenerated this week
      -- =====================================================
      -- Get the user's active mandalart
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
            AND generated_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
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
              'scheduled', true
            ),
            NOW()
          );
          v_diagnosis_reports := v_diagnosis_reports + 1;
          RAISE NOTICE 'Diagnosis report scheduled for user: %', v_user_record.user_id;
        END IF;
      END IF;

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
-- 2. Update get_users_for_weekly_report() to include
--    pending reports from both types
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_for_weekly_report()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  nickname TEXT,
  push_token TEXT,
  check_count BIGINT,
  user_timezone TEXT,
  user_language TEXT
) AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  v_week_end := (CURRENT_DATE AT TIME ZONE 'Asia/Seoul' - INTERVAL '1 day')::DATE;
  v_week_start := v_week_end - INTERVAL '6 days';

  RETURN QUERY
  SELECT DISTINCT
    u.id as user_id,
    u.email::TEXT,
    COALESCE(ug.nickname, split_part(u.email, '@', 1))::TEXT as nickname,
    pt.token::TEXT as push_token,
    COALESCE((
      SELECT COUNT(ch.id)
      FROM check_history ch
      WHERE ch.user_id = u.id
        AND ch.checked_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
        AND ch.checked_at < ((v_week_end + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
    ), 0) as check_count,
    COALESCE(up.timezone, 'Asia/Seoul')::TEXT as user_timezone,
    COALESCE(up.language, 'ko')::TEXT as user_language
  FROM auth.users u
  INNER JOIN mandalarts m ON m.user_id = u.id AND m.is_active = true
  LEFT JOIN push_tokens pt ON pt.user_id = u.id AND pt.is_active = true
  LEFT JOIN user_gamification ug ON ug.user_id = u.id
  LEFT JOIN user_preferences up ON up.user_id = u.id
  WHERE EXISTS (
    -- Has pending reports (either weekly or diagnosis)
    SELECT 1 FROM ai_reports ar
    WHERE ar.user_id = u.id
      AND ar.content LIKE '%"status": "pending"%'
      AND ar.generated_at >= (v_week_start::TIMESTAMP AT TIME ZONE 'Asia/Seoul')
  )
  GROUP BY u.id, u.email, ug.nickname, pt.token, up.timezone, up.language;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. New function to get pending reports for processing
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_reports()
RETURNS TABLE (
  report_id UUID,
  user_id UUID,
  report_type TEXT,
  metadata JSONB,
  user_timezone TEXT,
  user_language TEXT,
  push_token TEXT,
  nickname TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id as report_id,
    ar.user_id,
    ar.report_type::TEXT,
    ar.metadata,
    COALESCE(up.timezone, 'Asia/Seoul')::TEXT as user_timezone,
    COALESCE(up.language, 'ko')::TEXT as user_language,
    pt.token::TEXT as push_token,
    COALESCE(ug.nickname, split_part(u.email, '@', 1))::TEXT as nickname
  FROM ai_reports ar
  INNER JOIN auth.users u ON u.id = ar.user_id
  LEFT JOIN push_tokens pt ON pt.user_id = ar.user_id AND pt.is_active = true
  LEFT JOIN user_gamification ug ON ug.user_id = ar.user_id
  LEFT JOIN user_preferences up ON up.user_id = ar.user_id
  WHERE ar.content LIKE '%"status": "pending"%'
  ORDER BY ar.generated_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pending_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_reports() TO service_role;

-- =====================================================
-- 4. Add comments
-- =====================================================

COMMENT ON FUNCTION generate_weekly_reports_batch() IS
  'Batch function to schedule weekly reports AND diagnosis reports, called by pg_cron on Mondays';
COMMENT ON FUNCTION get_pending_reports() IS
  'Returns all pending reports (weekly and diagnosis) for Edge Function processing';
