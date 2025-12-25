# AI Coaching Session Model (Draft)

Source of truth: `docs/project/AI_MANDALART_COACHING_MILESTONE.md` (Section 9)

## Goal
Define session persistence for the 7-step coaching flow with resume support.

## Tables (Planned)
- `coaching_sessions`
  - id, user_id
  - persona_type
  - status (active|paused|completed)
  - current_step (1-7)
  - timezone
  - created_at, updated_at, last_resumed_at

- `coaching_steps`
  - id, session_id
  - step_index, step_key
  - state (not_started|in_progress|completed)
  - completed_at

- `coaching_answers`
  - id, session_id, step_key
  - answer_payload (json)
  - created_at

- `coaching_summaries`
  - session_id
  - short_summary
  - next_prompt_preview
  - updated_at

## Resume Rules
- Resume at `current_step` if session is active.
- If last_resumed_at > 7 days, show recap screen.
- Day boundaries use session timezone.

## Notes
- RLS policies required for all session tables.
- Save is triggered on each answer input.
