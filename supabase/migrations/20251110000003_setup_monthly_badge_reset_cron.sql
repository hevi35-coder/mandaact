-- Setup Cron Job for Monthly Badge Reset
-- Uses pg_cron extension to trigger monthly badge reset directly
-- Runs on 1st of each month at 00:00 UTC

-- Enable pg_cron extension if not already enabled
-- Note: On Supabase, pg_cron needs to be enabled via Dashboard first
-- Dashboard → Database → Extensions → Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Create a function that performs the monthly badge reset
-- This is a direct SQL implementation instead of calling Edge Function
CREATE OR REPLACE FUNCTION perform_monthly_badge_reset()
RETURNS TABLE(
  badges_reset INT,
  errors_count INT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_success_count INT := 0;
  v_error_count INT := 0;
  v_badge RECORD;
  v_user_achievement RECORD;
  v_repeat_count INT;
  v_next_repeat_count INT;
BEGIN
  -- Loop through all monthly repeatable badges
  FOR v_badge IN
    SELECT id, key, title, xp_reward, repeat_xp_multiplier
    FROM achievements
    WHERE badge_type = 'monthly' AND is_repeatable = true
  LOOP
    -- Loop through users who have unlocked this badge
    FOR v_user_achievement IN
      SELECT ua.id, ua.user_id, ua.achievement_id, ua.unlocked_at
      FROM user_achievements ua
      WHERE ua.achievement_id = v_badge.id
    LOOP
      BEGIN
        -- Get current repeat count from history
        SELECT COALESCE(MAX(repeat_count), 0)
        INTO v_repeat_count
        FROM achievement_unlock_history
        WHERE user_id = v_user_achievement.user_id
          AND achievement_id = v_user_achievement.achievement_id;

        v_next_repeat_count := v_repeat_count + 1;

        -- Move to unlock history
        INSERT INTO achievement_unlock_history (
          user_id,
          achievement_id,
          unlocked_at,
          xp_awarded,
          repeat_count,
          unlock_context
        ) VALUES (
          v_user_achievement.user_id,
          v_user_achievement.achievement_id,
          v_user_achievement.unlocked_at,
          v_badge.xp_reward,
          v_next_repeat_count,
          jsonb_build_object(
            'reset_date', NOW(),
            'reset_type', 'monthly_auto',
            'original_unlock', v_user_achievement.unlocked_at
          )
        );

        -- Remove from user_achievements
        DELETE FROM user_achievements
        WHERE id = v_user_achievement.id;

        v_success_count := v_success_count + 1;

        RAISE NOTICE 'Reset badge % for user %', v_badge.title, v_user_achievement.user_id;

      EXCEPTION WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE WARNING 'Error resetting badge % for user %: %',
          v_badge.title, v_user_achievement.user_id, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT
    v_success_count,
    v_error_count,
    format('Monthly badge reset completed: %s success, %s errors', v_success_count, v_error_count);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION perform_monthly_badge_reset() TO postgres;

-- Schedule the cron job
-- Runs at 00:00 UTC on the 1st day of every month
-- Note: This requires pg_cron extension to be enabled
DO $$
BEGIN
  -- Check if cron schema exists before scheduling
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.schedule(
      'monthly-badge-reset',           -- Job name
      '0 0 1 * *',                      -- Cron expression: minute hour day month weekday
      'SELECT perform_monthly_badge_reset();'
    );
    RAISE NOTICE 'Cron job scheduled successfully';
  ELSE
    RAISE WARNING 'pg_cron extension not found. Please enable it via Supabase Dashboard → Database → Extensions';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON FUNCTION perform_monthly_badge_reset IS 'Performs monthly badge reset: moves records to history and removes from user_achievements';

-- Query to check cron jobs:
-- SELECT * FROM cron.job WHERE jobname = 'monthly-badge-reset';

-- Query to check cron job run history:
-- SELECT * FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'monthly-badge-reset') ORDER BY start_time DESC LIMIT 10;

-- To manually trigger (for testing):
-- SELECT * FROM perform_monthly_badge_reset();

-- To manually unschedule (if needed):
-- SELECT cron.unschedule('monthly-badge-reset');
