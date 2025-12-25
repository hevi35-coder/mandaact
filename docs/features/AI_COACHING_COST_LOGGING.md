# AI Coaching Cost Logging (Draft)

Source of truth:
- `docs/project/AI_MANDALART_COACHING_MILESTONE.md` (Sections 11.3, 16)
- `docs/features/AI_COACHING_ANALYTICS.md`

## Goal
Track LLM token usage and estimated cost per session for go/no-go decisions.

## Events
- `coaching_tokens_logged`
  - `input_tokens`
  - `output_tokens`
  - `model`
  - `session_id`
  - `step`

- `coaching_cost_logged`
  - `cost_usd`
  - `model`
  - `session_id`
  - `step`

## Timing
- Log after each step completion (Step 1–7).
- Aggregate per session in analytics.

## Cost Calculation (Client-side placeholder)
- `cost_usd = (input_tokens * input_rate + output_tokens * output_rate) / 1_000_000`
- Rates injected via remote config or server settings.

## Notes
- Cost logging is telemetry only; AdMob/RevenueCat remain source of truth for revenue.
- If model pricing changes, update rates at config, not in code.
