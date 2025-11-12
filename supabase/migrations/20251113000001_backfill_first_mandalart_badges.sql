-- Backfill first_mandalart badges for existing users
-- This migration awards the first_mandalart badge to users who have created mandalarts
-- but received them before the trigger was installed

DO $$
DECLARE
  badge_id UUID;
  badge_xp INT;
  user_record RECORD;
  mandalart_count INT;
  action_count INT;
  min_actions INT := 16;
  min_text_length INT := 5;
BEGIN
  -- Get the first_mandalart badge ID and XP reward
  SELECT id, xp_reward INTO badge_id, badge_xp
  FROM achievements
  WHERE key = 'first_mandalart';

  -- Loop through users who have mandalarts but don't have the badge
  FOR user_record IN
    SELECT DISTINCT m.user_id
    FROM mandalarts m
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_achievements ua
      WHERE ua.user_id = m.user_id
      AND ua.achievement_id = badge_id
    )
  LOOP
    -- Count user's mandalarts
    SELECT COUNT(*) INTO mandalart_count
    FROM mandalarts
    WHERE user_id = user_record.user_id;

    -- Count valid actions (with sufficient text length)
    SELECT COUNT(*) INTO action_count
    FROM actions a
    JOIN sub_goals sg ON a.sub_goal_id = sg.id
    JOIN mandalarts m ON sg.mandalart_id = m.id
    WHERE m.user_id = user_record.user_id
      AND LENGTH(a.title) >= min_text_length;

    -- Only award if user has at least one mandalart and minimum actions
    IF mandalart_count > 0 AND action_count >= min_actions THEN
      -- Award the badge
      INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
      VALUES (user_record.user_id, badge_id, NOW())
      ON CONFLICT DO NOTHING;

      -- Update user XP
      UPDATE user_levels
      SET total_xp = total_xp + badge_xp,
          level = CASE
            WHEN (total_xp + badge_xp) < 100 THEN 1
            WHEN (total_xp + badge_xp) < 400 THEN 2
            WHEN (total_xp + badge_xp) < 2500 THEN FLOOR(POWER((total_xp + badge_xp - 400) / 100.0, 1.0 / 1.7)) + 3
            ELSE FLOOR(LN((total_xp + badge_xp - 2500) / 150.0 + 1) * 8) + 6
          END
      WHERE user_id = user_record.user_id;

      RAISE NOTICE 'Awarded first_mandalart badge to user % (% mandalarts, % actions)',
        user_record.user_id, mandalart_count, action_count;
    ELSE
      RAISE NOTICE 'User % has % mandalarts and % actions (need % actions minimum)',
        user_record.user_id, mandalart_count, action_count, min_actions;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete!';
END $$;
