-- Remove obsolete badge triggers that reference deleted badges
-- These triggers were created in manual/06_mandalart_completion_functions.sql
-- but the badges they reference (mandalart_50, mandalart_100, checks_100_v2)
-- were deleted in 20251113000006_delete_inactive_badges.sql
-- This causes "null value in column achievement_id" errors when checking actions

-- Drop the mandalart completion trigger
DROP TRIGGER IF EXISTS trigger_mandalart_completion_check ON check_history;

-- Drop the cumulative checks trigger
DROP TRIGGER IF EXISTS trigger_cumulative_checks_badge ON check_history;

-- Drop the associated functions
DROP FUNCTION IF EXISTS trigger_check_mandalart_completion();
DROP FUNCTION IF EXISTS check_cumulative_checks_badges();
DROP FUNCTION IF EXISTS check_mandalart_completion_badges(UUID, UUID);
DROP FUNCTION IF EXISTS get_mandalart_completion(UUID);

-- Success message
SELECT 'Obsolete badge triggers removed successfully' as status;
