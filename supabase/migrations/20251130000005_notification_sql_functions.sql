-- =====================================================
-- Notification SQL Functions (Direct Processing)
-- Created: 2025-11-30
-- Purpose: SQL functions that directly process notifications
--          without relying on Edge Functions
--
-- Note: These functions are called by pg_cron and use
--       pg_net to send push notifications directly.
-- =====================================================

-- =====================================================
-- 1. Send Push Notification via Expo API
-- =====================================================

CREATE OR REPLACE FUNCTION send_expo_push_notification(
  p_push_token TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request_id BIGINT;
  v_payload JSONB;
BEGIN
  -- Validate Expo push token format
  IF NOT (p_push_token LIKE 'ExponentPushToken[%]' OR p_push_token LIKE 'ExpoPushToken[%]') THEN
    RAISE WARNING 'Invalid Expo push token format: %', p_push_token;
    RETURN FALSE;
  END IF;

  -- Build payload
  v_payload := jsonb_build_object(
    'to', p_push_token,
    'sound', 'default',
    'title', p_title,
    'body', p_body,
    'data', p_data,
    'priority', 'high'
  );

  -- Send via pg_net
  SELECT net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object(
      'Accept', 'application/json',
      'Accept-encoding', 'gzip, deflate',
      'Content-Type', 'application/json'
    ),
    body := v_payload
  ) INTO v_request_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to send push notification: %', SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Process Streak Warning Notifications
-- =====================================================

CREATE OR REPLACE FUNCTION process_streak_warning_notifications()
RETURNS TABLE (
  users_processed INTEGER,
  notifications_sent INTEGER,
  errors_count INTEGER
) AS $$
DECLARE
  v_users_processed INTEGER := 0;
  v_notifications_sent INTEGER := 0;
  v_errors_count INTEGER := 0;
  v_user RECORD;
  v_title TEXT;
  v_body TEXT;
  v_today DATE;
  v_sent BOOLEAN;
BEGIN
  v_today := (NOW() AT TIME ZONE 'Asia/Seoul')::DATE;

  RAISE NOTICE 'Starting streak warning processing for date: %', v_today;

  -- Get users who need streak warning
  FOR v_user IN
    SELECT * FROM get_users_for_streak_warning()
  LOOP
    v_users_processed := v_users_processed + 1;

    BEGIN
      -- Build personalized message based on streak length
      IF v_user.current_streak >= 30 THEN
        v_title := v_user.nickname || '님, 🏆 ' || v_user.current_streak || '일 대기록을 지켜주세요!';
        v_body := '한 달 넘게 이어온 스트릭이에요.';
      ELSIF v_user.current_streak >= 7 THEN
        v_title := v_user.nickname || '님, ' || v_user.current_streak || '일 스트릭이 위험해요! 🔥';
        v_body := '오늘 놓치면 처음부터예요.';
      ELSE
        v_title := v_user.nickname || '님, ' || v_user.current_streak || '일 스트릭을 이어가세요! 🔥';
        v_body := '자정 전에 1개만 실천하면 유지돼요.';
      END IF;

      -- Send push notification
      v_sent := send_expo_push_notification(
        v_user.push_token,
        v_title,
        v_body,
        jsonb_build_object('type', 'streak_warning', 'streak', v_user.current_streak)
      );

      IF v_sent THEN
        -- Record notification sent
        PERFORM record_notification_sent(
          v_user.user_id,
          'streak_warning',
          jsonb_build_object('streak', v_user.current_streak)
        );
        v_notifications_sent := v_notifications_sent + 1;
        RAISE NOTICE 'Streak warning sent to user: % (streak: %)', v_user.user_id, v_user.current_streak;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors_count := v_errors_count + 1;
      RAISE WARNING 'Error processing user %: %', v_user.user_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Streak warning completed: users=%, sent=%, errors=%', v_users_processed, v_notifications_sent, v_errors_count;

  RETURN QUERY SELECT v_users_processed, v_notifications_sent, v_errors_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Process Comeback Notifications
-- =====================================================

CREATE OR REPLACE FUNCTION process_comeback_notifications()
RETURNS TABLE (
  users_processed INTEGER,
  notifications_sent INTEGER,
  errors_count INTEGER
) AS $$
DECLARE
  v_users_processed INTEGER := 0;
  v_notifications_sent INTEGER := 0;
  v_errors_count INTEGER := 0;
  v_user RECORD;
  v_title TEXT;
  v_body TEXT;
  v_days INTEGER;
  v_sent BOOLEAN;
BEGIN
  RAISE NOTICE 'Starting comeback notification processing';

  -- Process each comeback interval (3, 7, 14 days)
  FOR v_days IN SELECT unnest(ARRAY[3, 7, 14])
  LOOP
    RAISE NOTICE 'Processing comeback_%d...', v_days;

    FOR v_user IN
      SELECT * FROM get_users_for_comeback_notification(v_days)
    LOOP
      v_users_processed := v_users_processed + 1;

      BEGIN
        -- Build personalized message
        CASE v_days
          WHEN 3 THEN
            v_title := v_user.nickname || '님, 다시 시작해볼까요? 💪';
            v_body := '오늘 1개만 실천해보세요.';
          WHEN 7 THEN
            v_title := v_user.nickname || '님, 목표가 기다리고 있어요 🎯';
            v_body := '언제든 다시 시작할 수 있어요.';
          WHEN 14 THEN
            v_title := v_user.nickname || '님, 새로운 목표를 세워볼까요? ✨';
            v_body := '만다라트를 수정하거나 새 목표를 만들어보세요.';
          ELSE
            v_title := v_user.nickname || '님, 다시 시작해볼까요?';
            v_body := '목표가 기다리고 있어요.';
        END CASE;

        -- Send push notification
        v_sent := send_expo_push_notification(
          v_user.push_token,
          v_title,
          v_body,
          jsonb_build_object('type', 'comeback_' || v_days || 'd', 'days_inactive', v_days)
        );

        IF v_sent THEN
          -- Record notification sent
          PERFORM record_notification_sent(
            v_user.user_id,
            'comeback_' || v_days || 'd',
            jsonb_build_object('days_inactive', v_days, 'last_check_date', v_user.last_check_date)
          );
          v_notifications_sent := v_notifications_sent + 1;
          RAISE NOTICE 'Comeback_%d sent to user: %', v_days, v_user.user_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_errors_count := v_errors_count + 1;
        RAISE WARNING 'Error processing user % for comeback_%d: %', v_user.user_id, v_days, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Comeback notification completed: users=%, sent=%, errors=%', v_users_processed, v_notifications_sent, v_errors_count;

  RETURN QUERY SELECT v_users_processed, v_notifications_sent, v_errors_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Update Cron Jobs to use SQL functions directly
-- =====================================================

-- Remove old Edge Function based cron jobs
DO $$
BEGIN
  PERFORM cron.unschedule('streak-warning-notification');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('comeback-notification');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule new SQL-based cron jobs
SELECT cron.schedule(
  'streak-warning-notification',
  '0 12 * * *',  -- Every day at 12:00 UTC = 21:00 KST
  $$SELECT process_streak_warning_notifications()$$
);

SELECT cron.schedule(
  'comeback-notification',
  '0 10 * * *',  -- Every day at 10:00 UTC = 19:00 KST
  $$SELECT process_comeback_notifications()$$
);

-- =====================================================
-- 5. Comments
-- =====================================================

COMMENT ON FUNCTION send_expo_push_notification(TEXT, TEXT, TEXT, JSONB) IS 'Send push notification via Expo Push API using pg_net';
COMMENT ON FUNCTION process_streak_warning_notifications() IS 'Process and send streak warning notifications - runs daily at 21:00 KST';
COMMENT ON FUNCTION process_comeback_notifications() IS 'Process and send comeback notifications (3d/7d/14d) - runs daily at 19:00 KST';

-- =====================================================
-- 6. Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION send_expo_push_notification(TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION process_streak_warning_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION process_comeback_notifications() TO service_role;
