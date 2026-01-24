-- Remove unique constraint from user_levels.nickname
-- This allows multiple users to have the same nickname (e.g. "User")
DROP INDEX IF EXISTS idx_user_levels_nickname_unique;
