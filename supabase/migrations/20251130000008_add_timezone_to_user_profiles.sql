-- =====================================================
-- Add Timezone and Language to User Levels
-- Created: 2025-11-30
-- Purpose: Support global users with timezone and language preferences
-- =====================================================

-- Add timezone column (defaults to Asia/Seoul for existing users)
ALTER TABLE user_levels
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Seoul';

-- Add language column (defaults to 'ko' for existing users)
ALTER TABLE user_levels
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ko';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_levels_timezone ON user_levels(timezone);

-- Add comment for documentation
COMMENT ON COLUMN user_levels.timezone IS 'User timezone in IANA format (e.g., America/New_York, Asia/Seoul)';
COMMENT ON COLUMN user_levels.language IS 'User preferred language (e.g., ko, en)';

-- Create or replace function to upsert user profile with timezone/language
CREATE OR REPLACE FUNCTION upsert_user_profile(
  p_user_id UUID,
  p_timezone TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL
)
RETURNS user_levels AS $$
DECLARE
  v_result user_levels;
BEGIN
  -- Try to update existing record
  UPDATE user_levels SET
    timezone = COALESCE(p_timezone, user_levels.timezone),
    language = COALESCE(p_language, user_levels.language),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_result;

  -- If no rows updated (unlikely since trigger creates on signup), return null
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_user_profile(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION upsert_user_profile IS 'Update user profile with optional timezone and language';

-- Create a view for user_profiles to maintain backward compatibility with the hook
CREATE OR REPLACE VIEW user_profiles AS
SELECT
  user_id,
  nickname,
  timezone,
  language,
  created_at,
  updated_at
FROM user_levels;

-- Grant access to the view
GRANT SELECT ON user_profiles TO authenticated;

COMMENT ON VIEW user_profiles IS 'View for user profile data (timezone, language) - wraps user_levels table';
