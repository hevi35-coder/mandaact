-- Remove first_check badge trigger
-- Badge will now be awarded by the app's badgeService.evaluateAndUnlockBadges()
-- This ensures consistent behavior across web and mobile, with proper toast notifications

-- Drop the trigger first
DROP TRIGGER IF EXISTS trigger_first_check_badge ON check_history;

-- Drop the function
DROP FUNCTION IF EXISTS check_first_check_badge();

-- Add comment explaining the change
COMMENT ON TABLE user_achievements IS 'User achievement records. Note: first_check badge is now awarded by app-side badge evaluation (badgeService) instead of DB trigger, to ensure consistent UX with toast notifications.';
