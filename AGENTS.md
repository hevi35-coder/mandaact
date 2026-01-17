# Repository Guidelines (Agent Notes)

This repo is a pnpm + Turbo monorepo. Keep changes minimal, scoped, and aligned with existing patterns.

## Quick Start (Most Common)
- Install: `pnpm install` (repo root)
- Web dev: `pnpm --filter @mandaact/web dev`
- Mobile dev (Expo): `pnpm --filter @mandaact/mobile start` (then use simulator/device)
- Type-check: `pnpm type-check` (or `pnpm --filter @mandaact/mobile type-check`)
- Lint: `pnpm lint`
- Tests: `pnpm test` (web/shared; coverage before PR when feasible)

## Project Structure
- `apps/web`: React + Vite (web/PWA)
- `apps/mobile`: React Native + Expo (iOS/Android)
- `packages/shared`: shared types/logic/constants
- `supabase/migrations`, `supabase/functions`: backend schema/functions
- `docs/`: project documentation (index: `docs/README.md`)

## Must-Read Docs (Before Bigger Changes)
- `docs/README.md` (docs index)
- `docs/development/SETUP_GUIDE.md` (local setup)
- `docs/development/SIMULATOR_SETUP_GUIDE.md` (iOS/Android simulator setup)
- `docs/development/DEVELOPMENT.md` (coding rules)
- `docs/development/BUILD_GUIDE.md` (build + troubleshooting)
- `docs/development/DEPLOYMENT_GUIDE.md` (deploy flow: web/mobile)
- `docs/development/TESTFLIGHT_SUBMIT_GUIDE.md` (iOS submit specifics)
- `docs/project/ROADMAP.md` / `docs/project/PRD_mandaact.md` (planning/spec)
- `docs/marketing/PROMOTION_PLAN.md` (marketing strategy)
- `docs/marketing/BLOG_ROADMAP.md` (content schedule)
- `docs/marketing/BLOG_PUBLISHING_WORKFLOW.md` (blog automation SOP)
- `docs/troubleshooting/TROUBLESHOOTING.md` (troubleshooting index)

## Coding Conventions
- TypeScript-first; avoid `any` (prefer narrow unions + explicit return types).
- React components: functional. Components/files `PascalCase`; hooks `useX`; utils `camelCase`; constants `UPPER_SNAKE_CASE`.
- Keep components small (<200 LOC); extract logic into `hooks/` or `lib/`.
- Web UI: follow existing Tailwind/shadcn patterns; ESLint is the source of truth.

## Data/State & Supabase
- Prefer fixing root cause over UI-only patches (e.g., handle “no row exists” cases by `upsert` when appropriate).
- When touching migrations/functions: document breaking changes and validate against a safe/local project.

## Mobile Build / TestFlight (iOS)
- Apple rejects duplicate `CFBundleVersion` (Expo `expo.ios.buildNumber`); ensure it monotonically increases.
- If doing `eas build --local`, avoid committing temporary `app.json` buildNumber bumps unless explicitly requested.
- Submit flow reference: `docs/development/TESTFLIGHT_SUBMIT_GUIDE.md`.

## PR / Merge Workflow
- Branch naming: `feature/...`, `fix/...`, `hotfix/...`, `chore/...`.
- Conventional Commits required (`feat:`, `fix:`, `docs:`, `chore:`, etc.).
- Preferred flow: open PR → enable auto-merge (no “force merge”).
- PR description should include: purpose, key changes, and how it was tested.
- **Auto-Merge Rule**: Since CI is set up, ALWAYS enable auto-merge immediately after creating a PR.
  ```bash
  gh pr create --title "feat: ..." --body "..."
  gh pr merge --auto --merge
  ```

## Docs Hygiene
- Don’t commit secrets or `.p8` keys; keep credentials local.
- Avoid touching binary marketing assets unless intentionally editing screenshots.
- Remove accidental macOS metadata files (`.DS_Store`) if they appear.
