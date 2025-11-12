-- Backfill first_check badges for existing users
-- This migration awards the first_check badge to users who have check history
-- but didn't receive the badge because no trigger existed

DO $$
DECLARE
  badge_id UUID;
  badge_xp INT;
  user_record RECORD;
  check_count INT;
BEGIN
  -- Get the first_check badge ID and XP reward
  SELECT id, xp_reward INTO badge_id, badge_xp
  FROM achievements
  WHERE key = 'first_check';

  IF badge_id IS NULL THEN
    RAISE EXCEPTION 'first_check badge not found in achievements table';
  END IF;

  RAISE NOTICE 'Starting first_check badge backfill...';
  RAISE NOTICE 'Badge ID: %, XP Reward: %', badge_id, badge_xp;

  -- Loop through users who have check history but don't have the badge
  FOR user_record IN
    SELECT DISTINCT ch.user_id
    FROM check_history ch
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_achievements ua
      WHERE ua.user_id = ch.user_id
      AND ua.achievement_id = badge_id
    )
  LOOP
    -- Count user's checks (should be at least 1 if we're in this loop)
    SELECT COUNT(*) INTO check_count
    FROM check_history
    WHERE user_id = user_record.user_id;

    -- Award the badge
    INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
    VALUES (user_record.user_id, badge_id, NOW())
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
    WHERE user_id = user_record.user_id;

    RAISE NOTICE 'Awarded first_check badge to user % (% checks)',
      user_record.user_id, check_count;
  END LOOP;

  RAISE NOTICE 'first_check badge backfill complete!';
END $$;
