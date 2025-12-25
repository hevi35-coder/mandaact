# AI Coaching DB Migration Draft (Plan)

Status: Draft (action_preferences migration added; apply in DB when ready)

## Goal
Add required fields for AI coaching actions and active-state tracking.

## Planned Changes
- Add `actions.type` (required)
- Add `actions.routine_frequency`
- Add `actions.routine_weekdays`
- Add `actions.mission_completion_type`
- Add `actions.is_active` (default false)
- Add `actions.variant` (base|min|challenge)
- Add `action_preferences` table (user_id + sub_goal_id + active/minimum action ids)

## Constraints (Planned)
- CHECK: `type` in ('routine','mission','reference')
- If `type='routine'` then `routine_frequency` required
- If `type='mission'` then `mission_completion_type` required

## Notes
- RLS policies may need adjustment if new columns are required on insert.
- Add a unique constraint per sub_goal to enforce one active action.
