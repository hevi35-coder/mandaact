# AI Coaching Client Session Store (Draft)

Status: Draft

## Goal
Define client-side state for coaching session progress and resume behavior.

## State Model (Draft)
- current_session_id
- current_step (1-7)
- persona_type
- step_state (per step: not_started | in_progress | completed)
- answers_by_step (local cache)
- last_summary
- last_prompt_preview
- last_resumed_at

## Persistence
- Store minimal session state in local storage for quick resume.
- Sync full state from server on app open.

## Update Rules
- Update step state on each required input save.
- Update summary after each step completion.
- If app is reopened after 7+ days, show recap screen.

## Notes
- Client state should be resilient to partial data and missing answers.
