-- Phase 2: AI Coach Badge Function
-- Run this in Supabase Dashboard SQL Editor

-- Function: Check AI coach milestone badge (대화의 달인)
CREATE OR REPLACE FUNCTION check_ai_coach_badges()
RETURNS TRIGGER AS $$
DECLARE
  v_message_count INTEGER;
  v_badge_id UUID;
BEGIN
  -- Only count user messages (not assistant responses)
  IF NEW.role != 'user' THEN
    RETURN NEW;
  END IF;

  -- Get total user messages
  SELECT COUNT(*) INTO v_message_count
  FROM chat_messages
  WHERE session_id IN (
    SELECT id FROM chat_sessions WHERE user_id = (
      SELECT user_id FROM chat_sessions WHERE id = NEW.session_id
    )
  )
  AND role = 'user';

  -- Get badge ID
  SELECT id INTO v_badge_id FROM achievements WHERE key = 'ai_coach_100';

  -- Check if reached 100 messages
  IF v_message_count = 100 AND NOT EXISTS (
    SELECT 1 FROM user_achievements ua
    JOIN chat_sessions cs ON cs.user_id = ua.user_id
    WHERE cs.id = NEW.session_id
    AND ua.achievement_id = v_badge_id
  ) THEN
    -- Award badge
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT cs.user_id, v_badge_id
    FROM chat_sessions cs
    WHERE cs.id = NEW.session_id;

    -- Award XP
    UPDATE user_levels
    SET total_xp = total_xp + 600
    WHERE user_id = (SELECT user_id FROM chat_sessions WHERE id = NEW.session_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for AI coach badge
DROP TRIGGER IF EXISTS trigger_ai_coach_badge ON chat_messages;
CREATE TRIGGER trigger_ai_coach_badge
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION check_ai_coach_badges();

-- Success message
SELECT 'AI coach badge function created successfully' as status;