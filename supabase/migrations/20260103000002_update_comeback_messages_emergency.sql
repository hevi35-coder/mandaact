-- Update comeback notification messages to suggest Emergency Mode for 3/7 day inactivity
-- Also update get_users_for_comeback_notification to include emergency_action

DROP FUNCTION IF EXISTS get_users_for_comeback_notification(INTEGER);

CREATE OR REPLACE FUNCTION get_users_for_comeback_notification(days_inactive INTEGER)
RETURNS TABLE (
  user_id UUID,
  nickname TEXT,
  email TEXT,
  push_token TEXT,
  last_check_date DATE,
  days_since_last_check INTEGER,
  user_timezone TEXT,
  user_language TEXT,
  emergency_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH last_checks AS (
    SELECT
      ch.user_id,
      MAX(DATE(ch.checked_at AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))) as last_check
    FROM check_history ch
    LEFT JOIN user_levels ul ON ul.user_id = ch.user_id
    GROUP BY ch.user_id
  ),
  user_emergency AS (
    SELECT DISTINCT ON (user_id) user_id, emergency_action
    FROM mandalarts
    WHERE is_active = true
    ORDER BY user_id, updated_at DESC
  )
  SELECT
    ul.user_id,
    COALESCE(ul.nickname, split_part(u.email, '@', 1))::TEXT as nickname,
    u.email::TEXT,
    pt.token as push_token,
    lc.last_check as last_check_date,
    (DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul')) - lc.last_check)::INTEGER as days_since,
    COALESCE(ul.timezone, 'Asia/Seoul')::TEXT as user_timezone,
    COALESCE(ul.language, 'ko')::TEXT as user_language,
    ue.emergency_action
  FROM user_levels ul
  INNER JOIN auth.users u ON u.id = ul.user_id
  INNER JOIN push_tokens pt ON pt.user_id = ul.user_id AND pt.is_active = true
  INNER JOIN last_checks lc ON lc.user_id = ul.user_id
  LEFT JOIN user_emergency ue ON ue.user_id = ul.user_id
  WHERE
    -- Check exact days since last check (in user's timezone)
    (DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul')) - lc.last_check) = days_inactive
    -- Check this specific comeback notification hasn't been sent
    AND NOT EXISTS (
      SELECT 1 FROM notification_history nh
      WHERE nh.user_id = ul.user_id
        AND nh.notification_type = 'comeback_' || days_inactive || 'd'
        AND nh.sent_date = DATE(NOW() AT TIME ZONE COALESCE(ul.timezone, 'Asia/Seoul'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

  FOR v_days IN SELECT unnest(ARRAY[3, 7, 14])
  LOOP
    RAISE NOTICE 'Processing comeback_%d...', v_days;

    FOR v_user IN
      SELECT * FROM get_users_for_comeback_notification(v_days)
    LOOP
      v_users_processed := v_users_processed + 1;

      BEGIN
        -- Build personalized message based on language
        IF v_user.user_language = 'en' THEN
          -- English messages
          CASE v_days
            WHEN 3 THEN
              v_title := v_user.nickname || ', rough few days? 💪';
              v_body := COALESCE('Try just your emergency action: ' || v_user.emergency_action, 'Try completing just 1 small item today.');
            WHEN 7 THEN
              v_title := v_user.nickname || ', its been a week 🎯';
              v_body := 'Even just your "Safety Net" action counts: ' || COALESCE(v_user.emergency_action, 'Try 1 thing today.');
            WHEN 14 THEN
              v_title := v_user.nickname || ', time for a reset? ✨';
              v_body := 'Update your plan or start fresh with a new goal.';
            ELSE
              v_title := v_user.nickname || ', ready to start again?';
              v_body := 'Your goals are waiting.';
          END CASE;
        ELSE
          -- Korean messages (default)
          CASE v_days
            WHEN 3 THEN
              v_title := v_user.nickname || '님, 컨디션이 조금 버거우신가요? 💪';
              v_body := COALESCE('비상 모드(' || v_user.emergency_action || ') 1개만 해보는 건 어때요?', '오늘 딱 1개만 가볍게 실천해보세요.');
            WHEN 7 THEN
              v_title := v_user.nickname || '님, 벌써 일주일이 지났어요 🎯';
              v_body := COALESCE('최소한의 실천(' || v_user.emergency_action || ')으로 다시 리듬을 찾아보세요.', '준비되셨을 때 언제든 다시 시작해요.');
            WHEN 14 THEN
              v_title := v_user.nickname || '님, 아예 새롭게 시작해볼까요? ✨';
              v_body := '만다라트를 수정하거나 AI 코칭을 새로 받아보세요.';
            ELSE
              v_title := v_user.nickname || '님, 다시 시작해볼까요?';
              v_body := '목표가 기다리고 있어요.';
          END CASE;
        END IF;

        -- Send push notification
        v_sent := send_expo_push_notification(
          v_user.push_token,
          v_title,
          v_body,
          jsonb_build_object('type', 'comeback_' || v_days || 'd', 'days_inactive', v_days)
        );

        IF v_sent THEN
          -- Record notification sent using user's local date
          INSERT INTO notification_history (user_id, notification_type, sent_date, metadata)
          VALUES (
            v_user.user_id,
            'comeback_' || v_days || 'd',
            DATE(NOW() AT TIME ZONE v_user.user_timezone),
            jsonb_build_object('days_inactive', v_days, 'last_check_date', v_user.last_check_date, 'user_timezone', v_user.user_timezone)
          );
          v_notifications_sent := v_notifications_sent + 1;
          RAISE NOTICE 'Comeback_%d sent to user: % (tz: %)', v_days, v_user.user_id, v_user.user_timezone;
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
