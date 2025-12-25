# AI Coaching DB Gap Report (Draft)

Source of truth: `docs/project/AI_MANDALART_COACHING_MILESTONE.md` (Section 9.3.1)

## Current Schema Findings
- `actions` table only contains: id, sub_goal_id, position, title, created_at
- Missing fields for type/frequency/active state required by AI coaching.
- No table for per-sub-goal active/minimum action preferences.

## Required Additions (Draft)
- `actions.type` (required): `routine|mission|reference`
- `actions.routine_frequency` (required when routine)
- `actions.routine_weekdays` (optional when routine)
- `actions.mission_completion_type` (required when mission)
- `actions.is_active` (required, default false; one active per sub_goal)
- `actions.variant` (optional: base|min|challenge for AI-coached actions)
- `action_preferences` table: stores per-user active/minimum selections per sub_goal

## Validation Notes
- Save should be blocked if any action lacks required fields.
- Defaults: routine + 3x/week (or 1x/week for low time/low energy).

## Execution Phase
- Draft migration and RLS updates in implementation phase.
- Avoid applying changes until AI coaching MVP build stage.
