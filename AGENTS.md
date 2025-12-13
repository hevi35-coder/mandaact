# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by pnpm + Turbo. Main apps live in `apps/web` (React + Vite) and `apps/mobile` (React Native + Expo); shared logic, types, and constants live in `packages/shared`.
- Backend assets sit in `supabase/migrations` and `supabase/functions`. Additional reference docs are under `docs/`.
- Keep feature-specific UI, hooks, and utilities grouped by domain inside each app’s `src` to reduce cross-module coupling.

## Must-Read Docs
- `docs/README.md` – 문서 인덱스(어디에 무엇이 있는지)
- `docs/development/SETUP_GUIDE.md` – 로컬 개발 환경 세팅
- `docs/development/DEVELOPMENT.md` – 개발 규칙/코딩 가이드
- `docs/development/BUILD_GUIDE.md` – 빌드/EAS Secrets/트러블슈팅
- `docs/development/DEPLOYMENT_GUIDE.md` – Web/Mobile 배포 절차
- `docs/project/ROADMAP.md` – 우선순위/진행 계획(관련 문서 링크 허브)
- `docs/project/PRD_mandaact.md` – 제품 요구사항/스펙
- `docs/troubleshooting/TROUBLESHOOTING.md` – 자주 발생하는 장애 진단

## Build, Test, and Development Commands
- `pnpm install` – install workspace dependencies (root).
- `pnpm dev` / `pnpm --filter @mandaact/web dev` – run the web app locally.
- `pnpm --filter @mandaact/mobile start` – start the Expo dev server for mobile; `pnpm android` / `pnpm ios` to run on device/simulator.
- `pnpm build` – Turbo build for web + shared; use `pnpm build:web` or `pnpm build:mobile` for app-specific builds.
- `pnpm lint`, `pnpm type-check`, `pnpm test` – run linting, TS checks, and Vitest suites (web/shared). Prefer `pnpm test -- --coverage` before PRs.

## Coding Style & Naming Conventions
- TypeScript-first; avoid `any`. Use explicit return types and narrow unions. Shared types belong in `packages/shared/src/types`.
- React components are functional; files and components use `PascalCase` (e.g., `MandalartGrid.tsx`). Hooks use `useName` camelCase, utilities camelCase, constants `UPPER_SNAKE_CASE`.
- Favor small components (<200 lines) and extract non-trivial logic into hooks in `hooks/` or helpers in `lib/`.
- ESLint is the source of truth; match existing Tailwind class ordering and shadcn/ui patterns in `apps/web`.

## Testing Guidelines
- Web tests use Vitest + Testing Library; name files `*.test.ts`/`*.test.tsx` colocated with code or under `__tests__/`.
- Keep coverage steady; add regression tests for bugs and edge cases around Mandalart calculations, action scheduling, and Supabase interactions.
- For mobile, add lightweight unit tests where feasible; manually verify critical flows (auth, notifications, image upload) when changing native modules.

## Commit & Pull Request Guidelines
- Branch naming: `feature/…`, `fix/…`, `hotfix/…` (see `docs/development/DEVELOPMENT.md`).
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.); keep messages scoped and present tense.
- PRs should include: purpose summary, key changes, testing performed (`pnpm test`, device runs), and screenshots or recordings for UI updates (web/mobile). Link related issues/tasks and call out known risks or follow-ups.

## Security & Configuration
- Do not commit secrets. Required env vars (e.g., Supabase keys, Vision API keys) stay in local `.env`/`.env.local`; request rotation if exposed.
- When touching Supabase functions or migrations, run against a local/safe project and document any breaking schema changes in the PR.
