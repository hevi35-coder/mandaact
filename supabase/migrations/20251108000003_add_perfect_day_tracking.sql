-- Add last_perfect_day_date to user_levels for tracking perfect day bonus
ALTER TABLE user_levels ADD COLUMN IF NOT EXISTS last_perfect_day_date DATE;

-- Add comment
COMMENT ON COLUMN user_levels.last_perfect_day_date IS 'Last date when user received perfect day bonus (+50 XP)';
