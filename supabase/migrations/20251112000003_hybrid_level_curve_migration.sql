-- Hybrid Level Curve Migration
-- Smoothly transition from quadratic to hybrid logarithmic curve
-- IMPORTANT: No user will lose levels, only gain or stay the same

-- Step 1: Create backup of current levels
CREATE TABLE IF NOT EXISTS user_levels_backup_20251112 AS
SELECT * FROM user_levels;

-- Step 2: Create function to calculate new level from XP
CREATE OR REPLACE FUNCTION calculate_new_level_from_xp(p_total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_adjusted_xp INTEGER;
BEGIN
  IF p_total_xp < 100 THEN
    -- Level 1
    RETURN 1;
  ELSIF p_total_xp < 400 THEN
    -- Level 2: Keep fast initial progression
    RETURN 2;
  ELSIF p_total_xp < 2500 THEN
    -- Levels 3-5: Medium progression (power 1.7)
    v_adjusted_xp := p_total_xp - 400;
    RETURN FLOOR(POWER(v_adjusted_xp::NUMERIC / 100, 1::NUMERIC / 1.7)) + 3;
  ELSE
    -- Levels 6+: Logarithmic progression
    v_adjusted_xp := p_total_xp - 2500;
    RETURN FLOOR(LN(v_adjusted_xp::NUMERIC / 150 + 1) * 8) + 6;
  END IF;
END;
$$;

-- Step 3: Create function to migrate user levels safely
CREATE OR REPLACE FUNCTION migrate_user_level_safe(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_level INTEGER;
  v_total_xp INTEGER;
  v_new_level INTEGER;
  v_compensation_xp INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Get current level and XP
  SELECT level, total_xp
  INTO v_current_level, v_total_xp
  FROM user_levels
  WHERE user_id = p_user_id;

  -- Calculate new level
  v_new_level := calculate_new_level_from_xp(v_total_xp);

  -- Safety check: Never decrease level
  IF v_new_level < v_current_level THEN
    -- Calculate XP needed to maintain current level
    -- This should rarely happen with our curve design
    CASE
      WHEN v_current_level = 1 THEN
        v_compensation_xp := 0;
      WHEN v_current_level = 2 THEN
        v_compensation_xp := 400 - v_total_xp;
      WHEN v_current_level <= 5 THEN
        v_compensation_xp := (FLOOR(POWER((v_current_level - 3)::NUMERIC, 1.7) * 100) + 400) - v_total_xp;
      ELSE
        v_compensation_xp := (FLOOR((EXP((v_current_level - 6)::NUMERIC / 8) - 1) * 150) + 2500) - v_total_xp;
    END CASE;

    -- Add compensation XP to maintain level
    UPDATE user_levels
    SET total_xp = total_xp + v_compensation_xp,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    v_new_level := v_current_level;
  ELSE
    -- Update to new level (same or higher)
    UPDATE user_levels
    SET level = v_new_level,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Return migration result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'old_level', v_current_level,
    'new_level', v_new_level,
    'total_xp', v_total_xp + v_compensation_xp,
    'compensation_xp', v_compensation_xp,
    'level_gained', v_new_level - v_current_level
  );

  RETURN v_result;
END;
$$;

-- Step 4: Migrate all users
DO $$
DECLARE
  v_user RECORD;
  v_result JSONB;
  v_total_users INTEGER := 0;
  v_users_leveled_up INTEGER := 0;
  v_users_compensated INTEGER := 0;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO v_total_users FROM user_levels;

  -- Log migration start
  RAISE NOTICE 'Starting level curve migration for % users', v_total_users;

  -- Migrate each user
  FOR v_user IN SELECT user_id FROM user_levels
  LOOP
    v_result := migrate_user_level_safe(v_user.user_id);

    -- Count results
    IF (v_result->>'level_gained')::INTEGER > 0 THEN
      v_users_leveled_up := v_users_leveled_up + 1;
      RAISE NOTICE 'User % gained % level(s): % -> %',
        v_result->>'user_id',
        v_result->>'level_gained',
        v_result->>'old_level',
        v_result->>'new_level';
    END IF;

    IF (v_result->>'compensation_xp')::INTEGER > 0 THEN
      v_users_compensated := v_users_compensated + 1;
      RAISE NOTICE 'User % compensated with % XP to maintain level %',
        v_result->>'user_id',
        v_result->>'compensation_xp',
        v_result->>'new_level';
    END IF;
  END LOOP;

  -- Log migration summary
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  Total users: %', v_total_users;
  RAISE NOTICE '  Users leveled up: %', v_users_leveled_up;
  RAISE NOTICE '  Users compensated: %', v_users_compensated;
END $$;

-- Step 5: Create migration log table
CREATE TABLE IF NOT EXISTS level_curve_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_users INTEGER,
  users_leveled_up INTEGER,
  users_compensated INTEGER,
  migration_type VARCHAR(50) DEFAULT 'hybrid_logarithmic',
  notes TEXT
);

-- Insert migration record
INSERT INTO level_curve_migration_log (total_users, migration_type, notes)
SELECT
  COUNT(*),
  'hybrid_logarithmic',
  'Migrated from quadratic to hybrid logarithmic curve (power 1.7 + log). No users lost levels.'
FROM user_levels;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION calculate_new_level_from_xp TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_user_level_safe TO authenticated;

-- Add comments
COMMENT ON FUNCTION calculate_new_level_from_xp IS 'Calculate level using hybrid logarithmic curve (power 1.7 + log)';
COMMENT ON FUNCTION migrate_user_level_safe IS 'Safely migrate user level to new curve without losing progress';
COMMENT ON TABLE level_curve_migration_log IS 'Log of level curve migration events';
