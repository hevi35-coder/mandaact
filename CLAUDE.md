# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MandaAct is an AI-powered Mandalart (9x9 goal framework) action tracker with personalized coaching. Users can create mandalarts via image OCR or manual input, track daily actions, and receive AI coaching through Perplexity API.

**Core Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- State: Zustand (global), TanStack Query (server)
- Backend: Supabase (PostgreSQL, Auth, Storage, Edge Functions in Deno)
- AI: Google Cloud Vision API (OCR), Perplexity API (coaching)

## Development Commands

```bash
# Development
npm run dev              # Start dev server (Vite)
npm run type-check       # TypeScript check without emit
npm run lint             # ESLint check
npm run build            # TypeScript compile + Vite build
npm run preview          # Preview production build

# Supabase (backend)
npx supabase start       # Start local Supabase (Docker required)
npx supabase status      # Check local Supabase status
npx supabase db push     # Push migrations to remote
npx supabase functions deploy <name>  # Deploy edge function
npx supabase functions logs <name>    # View function logs
npx supabase secrets list             # List secrets
npx supabase secrets set KEY=value    # Set secret

# Git workflow
git status && git branch  # Always check before changes
```

## Architecture

### Data Model: Mandalart Structure

The 9x9 Mandalart grid is decomposed into a hierarchical structure:
- **Mandalart** (1) → **SubGoals** (8) → **Actions** (64 total, 8 per sub-goal)
- Center cell = `center_goal` (핵심 목표)
- Surrounding 8 cells in center 3x3 = `sub_goals` (세부 목표)
- Each sub-goal has its own 3x3 grid with 8 actions (실천 항목)

**Database Cascade:**
```
mandalarts (user_id)
  └─ sub_goals (mandalart_id, position 1-8)
      └─ actions (sub_goal_id, position 1-8)
          └─ check_history (action_id, checked_at)
```

### Action Type System

Actions are classified into 3 types with AI-powered suggestions:
- **루틴 (routine)**: Recurring habits (daily/weekly/monthly)
- **미션 (mission)**: Completion goals (once or periodic)
- **참고 (reference)**: Reference/mindset items (not checkable)

**AI Suggestion Logic:** Rule-based pattern matching in `src/lib/actionTypes.ts`
- Analyzes Korean keywords (매일, 달성, 마음가짐, etc.)
- Returns type + confidence + reason + frequency/cycle parameters
- Used during mandalart creation and editable per-action

**Display Rules:** `shouldShowToday()` in `src/lib/actionTypes.ts`
- Routine: Show based on frequency + weekdays + period count
- Mission: Show until completion or within period window
- Reference: Always show (but not checkable)

### State Management Pattern

**Global State (Zustand):**
- `src/store/authStore.ts`: User authentication state
  - Initializes on app mount, subscribes to Supabase auth changes
  - Korean error translations for UX

**Server State (TanStack Query):**
- NOT heavily used yet, mostly direct Supabase client calls in components
- Opportunity for refactoring: Extract data fetching to custom hooks

**Local State (useState):**
- Component-specific UI state (loading, filters, selected items)

### Edge Functions Architecture

Located in `supabase/functions/`:

**`ocr-mandalart/`** (v4):
- Input: `image_url` from Supabase Storage
- Process: Google Cloud Vision API (`DOCUMENT_TEXT_DETECTION`)
- Key logic: Position-based parsing using `boundingPoly` coordinates
  - Maps text to 9x9 grid based on (centerX, centerY)
  - Groups multi-line text within same cell
  - Center (4,4) = center_goal, surrounding 8 = sub_goals
- Output: Structured JSON (`center_goal`, `sub_goals[]`)
- Auth: JWT token passed directly via `getUser(jwt)` (not just header)

**`chat/`** (v17):
- Input: `message`, `session_id` (optional)
- Process: Calls Perplexity API with user context
- Context building: Recent mandalart data + check history
- Message format: **Strict user/assistant alternation required**
  - System prompt embedded in first user message
  - Removes orphaned user messages to prevent errors
- Model: `sonar` (fast, optimized for UX)
- Output: AI reply + session_id

**`chat-v2/`**: Backup/experimental version

### Navigation & Routing

**Responsive Navigation:** `src/components/Navigation.tsx`
- Desktop: Top sticky bar
- Mobile: Bottom sticky bar
- Auto-hides on auth pages (/, /login, /signup)

**Main Routes:**
- `/dashboard`: Overview stats + quick links
- `/today`: Today's action checklist (grouped by mandalart)
- `/mandalart/list`: Mandalart management
- `/mandalart/create`: Dual input (image OCR or manual)
- `/mandalart/:id`: Detail view (9x9 grid visualization)
- `/stats`: Progress analytics
- `/settings/notifications`: PWA notification settings

### OCR Processing Flow

1. User uploads image → Supabase Storage (`mandalart-images` bucket)
2. Frontend calls `/ocr-mandalart` with `image_url` + JWT
3. Edge function:
   - Creates GCP JWT with `cloud-vision` scope
   - Calls Vision API with `languageHints: ['ko', 'en']`
   - Receives `textAnnotations[]` with bounding boxes
4. Parsing logic:
   - Calculate image bounds and 9x9 grid cell dimensions
   - Map each text block to grid cell using center coordinates
   - Consolidate multi-line text within same cell
   - Extract center goal (4,4) and 8 sub-goals (surrounding cells)
5. Returns structured data to frontend for user review/edit

**Key Files:**
- `src/pages/MandalartCreatePage.tsx`: UI + image upload
- `supabase/functions/ocr-mandalart/index.ts`: Processing logic
- `supabase/migrations/20251101000002_add_storage_policies.sql`: RLS policies

## Important Patterns

### Database Queries

Always use Row Level Security (RLS) filters:
```typescript
// Correct: User-scoped query
.from('mandalarts')
.select('*')
.eq('user_id', user.id)

// Actions with nested relations
.from('actions')
.select(`
  *,
  sub_goal:sub_goals (
    *,
    mandalart:mandalarts (*)
  )
`)
.eq('sub_goal.mandalart.user_id', user.id)
```

### Edge Function Authentication

**Critical:** Pass JWT directly to `getUser()`, not just in headers:
```typescript
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_ANON_KEY'),  // Use ANON_KEY, not SERVICE_ROLE
  {
    global: {
      headers: { Authorization: authHeader },
    },
  }
)

const jwt = authHeader.replace('Bearer ', '')
const { data: { user }, error } = await supabaseClient.auth.getUser(jwt)
```

### Perplexity API Message Format

**Strict rules:**
- NO `system` role (not supported)
- Messages MUST alternate user/assistant
- Embed system prompt in first user message
- Remove orphaned user messages before API call

```typescript
// Correct pattern
const messages = []
if (!history || history.length === 0) {
  messages.push({
    role: 'user',
    content: `${systemPrompt}\n\n사용자 질문: ${message}`
  })
} else {
  // Handle alternation...
  const lastMessage = history[history.length - 1]
  if (lastMessage.role === 'user') {
    messages.pop() // Remove orphaned user message
  }
  messages.push({ role: 'user', content: message })
}
```

### Component Grouping Pattern

When displaying multiple items, group by mandalart for clarity:
```typescript
const actionsByMandalart = actions.reduce((groups, action) => {
  const mandalartId = action.sub_goal.mandalart.id
  if (!groups[mandalartId]) {
    groups[mandalartId] = {
      mandalart: action.sub_goal.mandalart,
      actions: []
    }
  }
  groups[mandalartId].actions.push(action)
  return groups
}, {})
```

See `src/pages/TodayChecklistPage.tsx` for collapsible sections implementation.

## Session Context & Documentation

**Always read these files when resuming work:**
- `SESSION_SUMMARY.md`: Latest session status, completed work, next steps
- `IMPROVEMENTS.md`: Feature improvement tracking (20 items total)
- `PHASE_1A_STATUS.md`: OCR implementation details (if working on OCR)

**Current Progress (as of 2025-11-01):**
- Phase 1-A: Image OCR ✅ (completed)
- Phase 1: UX improvements ✅ (4/4 completed)
- Phase 2: Feature expansion (0/4, next priority)

## Testing & Deployment

**Local Testing:**
```bash
# Frontend
npm run dev  # http://localhost:5173

# Test authentication flow
# 1. Sign up with test email
# 2. Create mandalart (manual or image)
# 3. Check "오늘의 실천" page
# 4. Test AI chat (bottom-right button)
```

**Edge Function Testing:**
```bash
# View logs in real-time
supabase functions logs <name> --tail

# Check deployment status
supabase functions list
```

**Deployment:**
- Frontend: Vercel (auto-deploy on git push)
- Backend: Supabase (manual deploy via CLI)

**Secrets Management:**
```bash
# NEVER commit secrets to .env.local
# Set in Supabase dashboard or CLI:
supabase secrets set GCP_PROJECT_ID=xxx
supabase secrets set GCP_CLIENT_EMAIL=xxx
supabase secrets set GCP_PRIVATE_KEY="$(cat key.json | jq -r .private_key)"
supabase secrets set PERPLEXITY_API_KEY=pplx-xxx
```

## Common Issues & Solutions

**OCR fails with "Failed to get access token":**
- Check GCP JWT has `scope: 'https://www.googleapis.com/auth/cloud-vision'`
- Verify private key format: `privateKey.replace(/\\n/g, '\n')`

**Chat returns 400 "Message format error":**
- Ensure user/assistant alternation
- Remove system role, embed in first user message
- Check for orphaned user messages in history

**Navigation shows on auth pages:**
- Navigation component checks `location.pathname` and `user` state
- Should auto-hide on /, /login, /signup

**Storage upload fails:**
- Check RLS policies exist: `20251101000002_add_storage_policies.sql`
- Verify bucket name: `mandalart-images`
- User must be authenticated

## Terminology (Korean)

Consistent UI terminology (established in Phase 1):
- "만다라트 관리" (not "내 만다라트" or "만다라트 목록")
- "오늘의 진행상황" (not "진행상황" or "오늘의 진행률")
- "오늘의 실천" (Today's practice page)
- "실천하러 가기" (Quick link to today's practice)
