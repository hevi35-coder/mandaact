-- Backfill volume badges for existing users
-- This migration awards volume badges (50, 100, 250, 500, 1000, 2500, 5000 checks) to users
-- who have achieved these milestones but didn't receive badges due to no trigger/frontend-only evaluation

DO $$
DECLARE
  user_record RECORD;
  badge_record RECORD;
  awarded_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting volume badges backfill...';

  -- Loop through all users with check history
  FOR user_record IN
    SELECT user_id, COUNT(*) as check_count
    FROM check_history
    GROUP BY user_id
    HAVING COUNT(*) >= 50  -- Only check users with at least 50 checks
  LOOP
    RAISE NOTICE 'Checking user % (% total checks)', user_record.user_id, user_record.check_count;

    -- Check each volume badge tier by querying achievements table
    FOR badge_record IN
      SELECT id, key, xp_reward,
             CAST(unlock_condition->>'count' AS INT) as required_count
      FROM achievements
      WHERE key IN ('checks_50', 'checks_100', 'checks_250', 'checks_500', 'checks_1000', 'checks_2500', 'checks_5000')
      AND unlock_condition->>'type' = 'total_checks'
      ORDER BY CAST(unlock_condition->>'count' AS INT) ASC
    LOOP
      -- Only award if user's check count qualifies
      IF user_record.check_count >= badge_record.required_count THEN
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

  RAISE NOTICE 'Volume badges backfill complete! Total badges awarded: %', awarded_count;
END $$;
