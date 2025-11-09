-- Add nickname field to user_levels table

-- Add nickname column with constraints
ALTER TABLE user_levels ADD COLUMN nickname TEXT;

-- Add constraints
ALTER TABLE user_levels ADD CONSTRAINT nickname_length_check
  CHECK (LENGTH(nickname) >= 2 AND LENGTH(nickname) <= 12);

-- Add unique constraint (case-insensitive)
CREATE UNIQUE INDEX idx_user_levels_nickname_unique
  ON user_levels (LOWER(nickname));

-- Make nickname NOT NULL after setting default values for existing users
-- For existing users without nickname, set default to 'User' + random 4 digits
DO $$
DECLARE
  user_record RECORD;
  default_nickname TEXT;
  counter INT := 1;
BEGIN
  FOR user_record IN SELECT id FROM user_levels WHERE nickname IS NULL LOOP
    LOOP
      default_nickname := '사용자' || LPAD(counter::TEXT, 4, '0');

      -- Try to insert, if unique constraint fails, increment counter
      BEGIN
        UPDATE user_levels
        SET nickname = default_nickname
        WHERE id = user_record.id;
        EXIT; -- Success, exit inner loop
      EXCEPTION WHEN unique_violation THEN
        counter := counter + 1;
      END;
    END LOOP;
  END LOOP;
END $$;

-- Now make nickname NOT NULL
ALTER TABLE user_levels ALTER COLUMN nickname SET NOT NULL;

-- Add comment
COMMENT ON COLUMN user_levels.nickname IS 'User display name (2-12 characters, unique, case-insensitive)';
