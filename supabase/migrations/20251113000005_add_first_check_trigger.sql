-- Add trigger to automatically award first_check badge on first check_history INSERT
-- This prevents future users from missing the badge due to frontend-only evaluation

-- Create trigger function
CREATE OR REPLACE FUNCTION check_first_check_badge()
RETURNS TRIGGER AS $$
DECLARE
  badge_id UUID;
  badge_xp INT := 30;
BEGIN
  -- Get the first_check badge ID
  SELECT id INTO badge_id
  FROM achievements
  WHERE key = 'first_check';

  IF badge_id IS NULL THEN
    RAISE WARNING 'first_check badge not found in achievements table';
    RETURN NEW;
  END IF;

  -- Check if user already has the badge
  IF NOT EXISTS (
    SELECT 1
    FROM user_achievements
    WHERE user_id = NEW.user_id
    AND achievement_id = badge_id
  ) THEN
    -- Award the badge
    INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
    VALUES (NEW.user_id, badge_id, NOW())
    ON CONFLICT DO NOTHING;

    -- Update user XP and recalculate level
    UPDATE user_levels
    SET total_xp = total_xp + badge_xp,
        level = CASE
          WHEN (total_xp + badge_xp) < 100 THEN 1
          WHEN (total_xp + badge_xp) < 400 THEN 2
          WHEN (total_xp + badge_xp) < 2500 THEN FLOOR(POWER((total_xp + badge_xp - 400) / 100.0, 1.0 / 1.7)) + 3
          ELSE FLOOR(LN((total_xp + badge_xp - 2500) / 150.0 + 1) * 8) + 6
        END
    WHERE user_id = NEW.user_id;

    RAISE NOTICE 'Awarded first_check badge to user % (+% XP)', NEW.user_id, badge_xp;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on check_history INSERT
DROP TRIGGER IF EXISTS trigger_first_check_badge ON check_history;

CREATE TRIGGER trigger_first_check_badge
AFTER INSERT ON check_history
FOR EACH ROW
EXECUTE FUNCTION check_first_check_badge();

-- Add comment for documentation
COMMENT ON FUNCTION check_first_check_badge() IS 'Automatically awards first_check badge when user creates their first check_history record';
COMMENT ON TRIGGER trigger_first_check_badge ON check_history IS 'Awards first_check badge on first check';
