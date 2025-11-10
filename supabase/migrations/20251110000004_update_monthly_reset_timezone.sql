-- Update Monthly Badge Reset to Korean Timezone with Grace Period
-- Changes to 2-phase system:
-- Phase 1: Evaluation on 2nd day 00:00 KST (includes yesterday checks)
-- Phase 2: Reset on 2nd day 03:00 KST (cleanup for next month)

-- First, unschedule the existing job
SELECT cron.unschedule('monthly-badge-reset');

-- ============================================================================
-- Phase 1: Badge Evaluation Function
-- ============================================================================
-- Evaluates previous month badges including grace period (yesterday checks)
-- Runs on 2nd day 00:00 KST (UTC 1st day 15:00)

CREATE OR REPLACE FUNCTION perform_monthly_badge_evaluation()
RETURNS TABLE(
  badges_evaluated INT,
  badges_unlocked INT,
  errors_count INT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_evaluated_count INT := 0;
  v_unlocked_count INT := 0;
  v_error_count INT := 0;
  v_badge RECORD;
  v_user RECORD;
  v_is_achieved BOOLEAN;
  v_evaluation_start TIMESTAMPTZ;
  v_evaluation_end TIMESTAMPTZ;
BEGIN
  -- Calculate evaluation period for previous month
  -- Previous month 1st 00:00 to current month 1st 23:59 (KST)
  v_evaluation_start := DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Seoul')::DATE - INTERVAL '1 month');
  v_evaluation_end := DATE_TRUNC('day', (NOW() AT TIME ZONE 'Asia/Seoul')::DATE) + INTERVAL '23 hours 59 minutes 59 seconds';

  RAISE NOTICE 'Monthly badge evaluation started. Period: % to % (KST)',
    v_evaluation_start AT TIME ZONE 'Asia/Seoul',
    v_evaluation_end AT TIME ZONE 'Asia/Seoul';

  -- Loop through all monthly badges
  FOR v_badge IN
    SELECT id, key, title, xp_reward, unlock_condition, badge_type
    FROM achievements
    WHERE badge_type = 'monthly' AND is_repeatable = true
  LOOP
    -- Get all users who might be eligible (don't have the badge yet)
    FOR v_user IN
      SELECT DISTINCT u.id as user_id
      FROM auth.users u
      WHERE NOT EXISTS (
        SELECT 1 FROM user_achievements ua
        WHERE ua.user_id = u.id AND ua.achievement_id = v_badge.id
      )
    LOOP
      BEGIN
        v_evaluated_count := v_evaluated_count + 1;
        v_is_achieved := FALSE;

        -- Evaluate based on badge condition type
        CASE v_badge.unlock_condition->>'type'
          WHEN 'monthly_completion' THEN
            -- Monthly completion percentage
            DECLARE
              v_threshold INT := (v_badge.unlock_condition->>'threshold')::INT;
              v_completion_rate DECIMAL;
            BEGIN
              WITH monthly_stats AS (
                SELECT
                  COUNT(DISTINCT a.id) as total_actions,
                  COUNT(DISTINCT CASE
                    WHEN ch.checked_at >= v_evaluation_start
                      AND ch.checked_at <= v_evaluation_end
                    THEN ch.action_id
                  END) as completed_actions
                FROM actions a
                LEFT JOIN check_history ch ON ch.action_id = a.id AND ch.user_id = v_user.user_id
                WHERE a.sub_goal_id IN (
                  SELECT sg.id FROM sub_goals sg
                  JOIN mandalarts m ON m.id = sg.mandalart_id
                  WHERE m.user_id = v_user.user_id AND m.is_active = true
                )
              )
              SELECT COALESCE(
                (completed_actions::DECIMAL / NULLIF(total_actions, 0)) * 100,
                0
              ) INTO v_completion_rate
              FROM monthly_stats;

              v_is_achieved := v_completion_rate >= v_threshold;
            END;

          WHEN 'monthly_streak' THEN
            -- Check daily activity for the month
            DECLARE
              v_required_days INT := (v_badge.unlock_condition->>'days')::INT;
              v_active_days INT;
            BEGIN
              SELECT COUNT(DISTINCT DATE(checked_at AT TIME ZONE 'Asia/Seoul'))
              INTO v_active_days
              FROM check_history
              WHERE user_id = v_user.user_id
                AND checked_at >= v_evaluation_start
                AND checked_at <= v_evaluation_end;

              v_is_achieved := v_active_days >= v_required_days;
            END;

          WHEN 'perfect_week_in_month' THEN
            -- Check for at least one perfect week (7 consecutive days with checks)
            DECLARE
              v_perfect_weeks INT;
            BEGIN
              WITH daily_checks AS (
                SELECT DATE(checked_at AT TIME ZONE 'Asia/Seoul') as check_date
                FROM check_history
                WHERE user_id = v_user.user_id
                  AND checked_at >= v_evaluation_start
                  AND checked_at <= v_evaluation_end
                GROUP BY DATE(checked_at AT TIME ZONE 'Asia/Seoul')
              ),
              week_groups AS (
                SELECT
                  check_date,
                  check_date - (ROW_NUMBER() OVER (ORDER BY check_date))::INT * INTERVAL '1 day' as grp
                FROM daily_checks
              )
              SELECT COUNT(*)
              INTO v_perfect_weeks
              FROM (
                SELECT grp
                FROM week_groups
                GROUP BY grp
                HAVING COUNT(*) >= 7
              ) perfect;

              v_is_achieved := v_perfect_weeks >= 1;
            END;

          ELSE
            RAISE WARNING 'Unknown badge condition type: %', v_badge.unlock_condition->>'type';
        END CASE;

        -- If achieved, unlock the badge
        IF v_is_achieved THEN
          INSERT INTO user_achievements (user_id, achievement_id)
          VALUES (v_user.user_id, v_badge.id)
          ON CONFLICT (user_id, achievement_id) DO NOTHING;

          v_unlocked_count := v_unlocked_count + 1;
          RAISE NOTICE 'Badge "%" unlocked for user %', v_badge.title, v_user.user_id;
        END IF;

      EXCEPTION WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE WARNING 'Error evaluating badge "%" for user %: %',
          v_badge.title, v_user.user_id, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT
    v_evaluated_count,
    v_unlocked_count,
    v_error_count,
    format('Badge evaluation completed: %s evaluated, %s unlocked, %s errors',
      v_evaluated_count, v_unlocked_count, v_error_count);
END;
$$;

-- ============================================================================
-- Phase 2: Badge Reset Function
-- ============================================================================
-- Resets monthly badges after evaluation
-- Runs on 2nd day 03:00 KST (UTC 1st day 18:00)

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
  RAISE NOTICE 'Monthly badge reset started (KST 03:00)';

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
            'reset_type', 'monthly_auto_kst',
            'timezone', 'Asia/Seoul (KST, UTC+9)',
            'reset_schedule', '2nd day 03:00 KST',
            'original_unlock', v_user_achievement.unlocked_at
          )
        );

        -- Remove from user_achievements
        DELETE FROM user_achievements
        WHERE id = v_user_achievement.id;

        v_success_count := v_success_count + 1;

        RAISE NOTICE 'Reset badge "%" for user % (repeat #%)',
          v_badge.title, v_user_achievement.user_id, v_next_repeat_count;

      EXCEPTION WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        RAISE WARNING 'Error resetting badge "%" for user %: %',
          v_badge.title, v_user_achievement.user_id, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT
    v_success_count,
    v_error_count,
    format('Badge reset completed: %s success, %s errors',
      v_success_count, v_error_count);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION perform_monthly_badge_evaluation() TO postgres;
GRANT EXECUTE ON FUNCTION perform_monthly_badge_reset() TO postgres;

-- ============================================================================
-- Schedule Cron Jobs
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    -- Job 1: Evaluation on 2nd day 00:00 KST (UTC 1st day 15:00)
    PERFORM cron.schedule(
      'monthly-badge-evaluation',
      '0 15 1 * *',  -- UTC 15:00 on 1st = KST 00:00 on 2nd
      'SELECT perform_monthly_badge_evaluation();'
    );

    -- Job 2: Reset on 2nd day 03:00 KST (UTC 1st day 18:00)
    PERFORM cron.schedule(
      'monthly-badge-reset',
      '0 18 1 * *',  -- UTC 18:00 on 1st = KST 03:00 on 2nd
      'SELECT perform_monthly_badge_reset();'
    );

    RAISE NOTICE 'Cron jobs scheduled successfully (KST timezone)';
  ELSE
    RAISE WARNING 'pg_cron extension not found';
  END IF;
END $$;

-- Add comments
COMMENT ON FUNCTION perform_monthly_badge_evaluation IS
  'Evaluates previous month badges with 24h grace period (runs 2nd day 00:00 KST)';
COMMENT ON FUNCTION perform_monthly_badge_reset IS
  'Resets monthly badges for re-challenge (runs 2nd day 03:00 KST)';

-- ============================================================================
-- Testing Queries
-- ============================================================================

-- Check cron jobs
-- SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'monthly-badge-%';

-- Manual test evaluation (dry run)
-- SELECT * FROM perform_monthly_badge_evaluation();

-- Manual test reset
-- SELECT * FROM perform_monthly_badge_reset();

-- Check next run times
-- SELECT
--   jobname,
--   schedule,
--   (SELECT max(end_time) FROM cron.job_run_details WHERE jobid = j.jobid) as last_run,
--   active
-- FROM cron.job j
-- WHERE jobname LIKE 'monthly-badge-%';
