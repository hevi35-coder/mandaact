-- Backfill streak badges for existing users
-- This migration awards streak badges (3, 7, 14, 30, 60, 100, 150 days) to users
-- who have achieved these streaks but didn't receive badges due to no trigger/frontend-only evaluation

DO $$
DECLARE
  user_record RECORD;
  badge_record RECORD;
  awarded_count INT := 0;
  longest_streak INT;
BEGIN
  RAISE NOTICE 'Starting streak badges backfill...';

  -- Loop through all users with check history
  FOR user_record IN
    SELECT DISTINCT user_id
    FROM check_history
  LOOP
    -- Calculate longest streak for this user
    -- This is a simplified approach: count consecutive days from check_history
    WITH unique_dates AS (
      -- Get unique check dates for this user (convert UTC timestamp to date)
      SELECT DISTINCT DATE(checked_at AT TIME ZONE 'UTC') as check_date
      FROM check_history
      WHERE user_id = user_record.user_id
      ORDER BY check_date DESC
    ),
    date_sequences AS (
      -- Assign a group number to consecutive dates
      -- Consecutive dates will have the same group number
      SELECT
        check_date,
        check_date - (ROW_NUMBER() OVER (ORDER BY check_date))::INT * INTERVAL '1 day' as grp
      FROM unique_dates
    ),
    streak_lengths AS (
      -- Count the length of each streak (group)
      SELECT COUNT(*) as streak_length
      FROM date_sequences
      GROUP BY grp
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO longest_streak
    FROM streak_lengths;

    IF longest_streak = 0 THEN
      CONTINUE;  -- Skip users with no streaks
    END IF;

    RAISE NOTICE 'Checking user % (longest streak: % days)', user_record.user_id, longest_streak;

    -- Check each streak badge tier by querying achievements table
    FOR badge_record IN
      SELECT id, key, xp_reward,
             CAST(unlock_condition->>'days' AS INT) as required_days
      FROM achievements
      WHERE key IN ('streak_3', 'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100', 'streak_150')
      AND unlock_condition->>'type' = 'streak'
      ORDER BY CAST(unlock_condition->>'days' AS INT) ASC
    LOOP
      -- Only award if user's longest streak qualifies
      IF longest_streak >= badge_record.required_days THEN
        -- Check if user already has this badge
        IF NOT EXISTS (
          SELECT 1
          FROM user_achievements
          WHERE user_id = user_record.user_id
          AND achievement_id = badge_record.id
        ) THEN
          -- Award the badge
          INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
          VALUES (user_record.user_id, badge_record.id, NOW())
          ON CONFLICT DO NOTHING;

          -- Update user XP and recalculate level
          UPDATE user_levels
          SET total_xp = total_xp + badge_record.xp_reward,
              level = CASE
                WHEN (total_xp + badge_record.xp_reward) < 100 THEN 1
                WHEN (total_xp + badge_record.xp_reward) < 400 THEN 2
                WHEN (total_xp + badge_record.xp_reward) < 2500 THEN FLOOR(POWER((total_xp + badge_record.xp_reward - 400) / 100.0, 1.0 / 1.7)) + 3
                ELSE FLOOR(LN((total_xp + badge_record.xp_reward - 2500) / 150.0 + 1) * 8) + 6
              END
          WHERE user_id = user_record.user_id;

          awarded_count := awarded_count + 1;
          RAISE NOTICE '  ✓ Awarded % badge (+% XP) to user %', badge_record.key, badge_record.xp_reward, user_record.user_id;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Streak badges backfill complete! Total badges awarded: %', awarded_count;
END $$;
