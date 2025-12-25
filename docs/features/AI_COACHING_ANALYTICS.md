# AI Coaching Analytics (Final)

Source of truth: `docs/project/AI_MANDALART_COACHING_MILESTONE.md` (Section 16)

Status: Finalized

## Events

### Session Lifecycle
- `coaching_session_start` (persona, step=1, source)
- `coaching_step_complete` (step, time_spent, questions_count)
- `coaching_session_complete` (total_steps, total_time, actions_count)

### Corrections & Quality
- `coaching_correction_suggested` (rule_type, step)
- `coaching_correction_accepted` (rule_type, step)
- `coaching_correction_rejected` (rule_type, step)

### Monetization
- `coaching_ad_gate_shown` (reason=weekly_limit)
- `coaching_ad_watched` (ad_network, reward)
- `coaching_upgrade_clicked` (plan_type)
- `coaching_limit_reached` (reason=weekly_limit|slot_limit)

### Cost Tracking
- `coaching_tokens_logged` (input_tokens, output_tokens, model)
- `coaching_cost_logged` (cost_usd, model)

## Timing Guidelines
- `coaching_session_start`: when user enters Step 1 and submits first answer
- `coaching_step_complete`: when all required inputs for the step are saved
- `coaching_session_complete`: when Step 7 is confirmed and saved
- `coaching_correction_suggested`: when a correction card is shown
- `coaching_correction_accepted`: when user accepts suggested change
- `coaching_correction_rejected`: when user chooses to keep original
- `coaching_ad_gate_shown`: when ad gate modal is displayed
- `coaching_ad_watched`: after rewarded ad completes
