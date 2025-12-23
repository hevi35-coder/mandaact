-- Allow 'ad_boost' bonus type for rewarded XP boost
-- Fix: XPBoostButton calls xpService.activateAdBoost() with bonus_type='ad_boost'
-- but the original constraint did not include 'ad_boost', causing inserts to fail.

ALTER TABLE IF EXISTS user_bonus_xp
  DROP CONSTRAINT IF EXISTS user_bonus_xp_bonus_type_check;

ALTER TABLE IF EXISTS user_bonus_xp
  ADD CONSTRAINT user_bonus_xp_bonus_type_check
  CHECK (bonus_type IN ('weekend', 'comeback', 'level_milestone', 'perfect_week', 'ad_boost'));

