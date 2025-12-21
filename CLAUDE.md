# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository. Keep this file concise and link to `docs/` for detailed specs so it doesn’t drift.

## Start Here
- Repo rules / workflow: `AGENTS.md`
- Docs index (source of links): `docs/README.md`
- Product/plan: `docs/project/PRD_mandaact.md`, `docs/project/ROADMAP.md`
- Marketing/Ops: `docs/marketing/PROMOTION_PLAN.md`, `docs/marketing/BLOG_PUBLISHING_WORKFLOW.md`, `docs/marketing/BLOG_ROADMAP.md`

## Quick Commands (repo root)
```bash
pnpm install

# Dev
pnpm dev:web
pnpm dev:mobile

# Quality
pnpm lint
pnpm type-check
pnpm test
```

## Repo Map
- `apps/web`: React + Vite web/PWA
- `apps/mobile`: React Native + Expo
- `packages/shared`: shared domain logic (XP, action type rules, validations)
- `supabase/migrations`: DB schema + RPC functions
- `supabase/functions`: Edge Functions (Deno)

## Domain Model (DB)
Mandalart hierarchy:
- `mandalarts` → `sub_goals` → `actions` → `check_history`

Gamification/profile:
- `user_levels` (level/XP/nickname/timezone/language)
- `achievements`, `user_achievements`
- `achievement_progress`, `achievement_unlock_history`
- `user_bonus_xp` (temporary multipliers; see `supabase/migrations/20251112000001_add_xp_multiplier_system.sql`)

Notes:
- `user_profiles` is a view wrapping `user_levels` for profile reads (timezone/language/nickname).

## Key Code Locations (Source of Truth)
- Action type rules + `shouldShowToday`: `packages/shared/src/lib/actionTypes.ts`
  - Web wrapper: `apps/web/src/lib/actionTypes.ts`
- Nickname validation: `packages/shared/src/lib/nicknameUtils.ts`
- Mobile XP integration: `apps/mobile/src/lib/xp.ts` (wraps shared XP service)
- Mobile stats queries: `apps/mobile/src/hooks/useStats.ts` (reads `user_levels`)
- Web “today” grouping UI: `apps/web/src/pages/TodayChecklistPage.tsx`

## Supabase / RLS Patterns
Always scope by user and active mandalart:
```ts
// Example: actions for active mandalarts
const { data, error } = await supabase
  .from('actions')
  .select(`
    id,
    type,
    sub_goal:sub_goals!inner(
      mandalart:mandalarts!inner(user_id, is_active)
    )
  `)
  .eq('sub_goal.mandalart.user_id', userId)
  .eq('sub_goal.mandalart.is_active', true)
```

When a row might not exist yet (common for new users), prefer `upsert` over `update` to avoid “0 rows updated” silent failures.

## Edge Functions (supabase/functions)
Current functions are under `supabase/functions/*` (e.g. `ocr-mandalart`, `parse-mandalart-text`, `generate-report`, `scheduled-report`, `send-push-notification`).

Auth pattern (Deno):
```ts
const jwt = authHeader?.replace('Bearer ', '')
const { data: { user }, error } = await supabaseClient.auth.getUser(jwt)
if (error || !user) throw new Error('Unauthorized')
```

## Mobile iOS Build / TestFlight Notes
- Apple rejects duplicate `CFBundleVersion` (Expo `expo.ios.buildNumber`). Ensure it monotonically increases.
- If using `eas build --local`, avoid committing temporary `app.json` buildNumber bumps unless explicitly requested.
- Reference: `docs/development/TESTFLIGHT_SUBMIT_GUIDE.md`

## Troubleshooting
- Entry point: `docs/troubleshooting/TROUBLESHOOTING.md`

