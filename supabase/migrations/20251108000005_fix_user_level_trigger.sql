-- Fix create_user_level_if_not_exists function to include nickname

-- Drop trigger first
DROP TRIGGER IF EXISTS auto_create_user_level ON mandalarts;

-- Drop function
DROP FUNCTION IF EXISTS create_user_level_if_not_exists();

-- Recreate function with nickname generation
CREATE OR REPLACE FUNCTION create_user_level_if_not_exists()
RETURNS TRIGGER AS $$
DECLARE
  default_nickname TEXT;
  counter INT := 1;
BEGIN
  -- Check if user_level already exists
  IF EXISTS (SELECT 1 FROM user_levels WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Generate unique nickname
  LOOP
    default_nickname := '사용자' || LPAD(counter::TEXT, 4, '0');
    
    BEGIN
      INSERT INTO user_levels (user_id, level, total_xp, nickname)
      VALUES (NEW.user_id, 1, 0, default_nickname);
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      counter := counter + 1;
    END;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER auto_create_user_level
  AFTER INSERT ON mandalarts
  FOR EACH ROW
  EXECUTE FUNCTION create_user_level_if_not_exists();
