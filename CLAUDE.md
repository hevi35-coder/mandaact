# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MandaAct is an AI-powered Mandalart (9x9 goal framework) action tracker with gamification, AI reports, and comprehensive progress analytics. Users can create mandalarts via 3 input methods (image OCR, text parsing, or manual input), track daily actions with smart type system, earn XP/badges, and receive AI-generated weekly reports.

**Core Tech Stack:**
- **Monorepo**: pnpm workspace (apps/web, apps/mobile, packages/shared)
- **Frontend (Web)**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Mobile**: React Native + Expo SDK 52 + NativeWind + React Navigation
- **State**: Zustand (global), TanStack Query (server)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions in Deno)
- **AI**: Google Cloud Vision API (OCR), Perplexity API (LLM)

**Key Features (Production):**
- 📸 3 Input Methods (image OCR, text paste, manual template)
- 🎮 Gamification (XP/levels, 21 badges, streaks, monthly challenges)
- 📊 AI Reports (weekly practice report, goal diagnosis via Perplexity)
- 📱 **Cross-Platform** (Web + iOS + Android with iPad support)
- 🔔 **Native Push Notifications** (Mobile) & PWA Notifications (Web)
- 🌍 **Global Support** (i18n: English/Korean)

## Development Commands

```bash
# Development
pnpm dev:web             # Start Web dev server (Vite)
pnpm dev:mobile          # Start Mobile dev server (Expo)

# Build
pnpm build:web           # Build Web for production
pnpm build:mobile        # Build Mobile (EAS Build)

# Quality Checks
pnpm type-check          # TypeScript check (workspace)
pnpm lint                # ESLint check (workspace)

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
mandalarts (user_id, is_active)
  └─ sub_goals (mandalart_id, position 1-8)
      └─ actions (sub_goal_id, position 1-8, type, frequency)
          └─ check_history (action_id, checked_at)

user_gamification (user_id, total_xp, current_level, current_streak)
  └─ user_achievements (user_id, achievement_id, unlocked_at)
      └─ achievement_unlock_history (repeat_count, xp_awarded)

xp_multipliers (user_id, multiplier_type, active_until)
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

### Gamification System

**XP System:** `src/lib/stats.ts`
- **Linear Progression**: XP requirements increase by +50 per level
  - Level 1→2: 100 XP (base)
  - Level 2→3: 150 XP (+50)
  - Level 3→4: 200 XP (+50)
  - ...continues with +50 increment
  - Formula: Total XP for level n = 25n² + 25n - 50 (n ≥ 2)
  - Level thresholds:
    - Level 1: 0 XP
    - Level 2: 100 XP
    - Level 3: 250 XP
    - Level 5: 700 XP
    - Level 10: 2,700 XP
- **XP Multipliers** (4 types, stackable): `src/lib/xpMultipliers.ts`
  - Weekend Bonus (1.5x): Saturday & Sunday
  - Comeback Bonus (1.5x): 3 days after 3+ day absence
  - Level Milestone (2x): 7 days after reaching level 5, 10, 15, 20, 25, 30
  - Perfect Week (2x): 7 days after 80%+ weekly completion
- **Anti-Cheat**: Daily check limit (3x per action), 10-second cooldown, spam detection
- **Functions**:
  - `calculateLevelFromXP(totalXP)`: Get level from total XP
  - `getXPForNextLevel(level)`: Get XP requirement to reach level
  - `getActiveMultipliers(userId)`: Get current active multipliers
  - `calculateTotalMultiplier(multipliers)`: Apply all multipliers

**Badge System:** `src/lib/badgeEvaluator.ts`
- **21 Achievements** across 7 categories:
  - Practice: first_check, checks_10, checks_100, checks_1000
  - Streak: streak_7, streak_30, streak_60, streak_100, streak_150
  - Consistency: active_7, active_30, active_60, active_100
  - Monthly: monthly_80, monthly_90, monthly_perfect, monthly_active (repeatable)
  - Completion: complete_subgoal, complete_mandalart
  - Special: early_bird, night_owl
- **Auto-Unlock**: RPC function `unlock_achievement()` + client evaluator
- **Progress Tracking**: RPC function `evaluate_badge_progress()` returns current/target/progress
- **Monthly Reset**: Cron job (pg_cron) resets monthly badges on 1st of month
- **UI Features**: Toast notifications, NEW indicators, sparkle animations

**Streak System:** `src/lib/stats.ts`
- **KST Timezone**: Accurate date calculation with date-fns-tz
- **Freeze Feature**: One-day skip protection (limited)
- **Calculation**: Recursive CTE in database for current streak

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

**`parse-mandalart-text/`**:
- Input: `text` (tab-separated or structured text from clipboard)
- Process: Custom parsing logic for various text formats
  - Tab-separated values (TSV from Excel/Google Sheets)
  - Structured Korean text with section markers
- Output: Same structured JSON as OCR
- Use case: Quick paste from existing documents

**`generate-weekly-report/`**:
- Input: `user_id`, `week_start` (optional, defaults to last Monday)
- Process: Perplexity API (sonar model) with user context
- Context: Last 7 days check history, completion rates, sub-goal progress
- Output: Markdown-formatted report with insights and suggestions
- Sections: Summary, What Went Well, Areas to Improve, Next Week Strategy

**`generate-goal-diagnosis/`**:
- Input: `mandalart_id`
- Process: Perplexity API analyzes mandalart structure
- Analysis Framework: SMART criteria
  - Specific, Measurable, Achievable, Relevant, Time-bound
- Output: Markdown report with scores and improvement suggestions

**`reset-monthly-badges/`** (backup, primary is SQL cron):
- Input: None (scheduled)
- Process: Resets monthly repeatable badges
- Logic: Move to history with repeat_count++, remove from user_achievements
- Schedule: 1st day of month at 00:00 UTC

**`chat/`** (v17) - DEPRECATED:
- Previously used for AI coaching chatbot
- Removed in favor of report-based approach
- May be re-implemented in future phases

### Triple Input Methods Architecture

**1. Image OCR** (`MandalartCreatePage.tsx` - Image Upload tab):
- Upload flow: Image → Supabase Storage → OCR Edge Function → Result preview
- Supported formats: JPG, PNG, HEIC
- Max size: 10MB
- Google Cloud Vision API integration
- User review/edit before save

**2. Text Parsing** (`MandalartCreatePage.tsx` - Text Paste tab):
- Paste structured text from clipboard
- Formats supported:
  - Tab-separated (TSV from spreadsheets)
  - Korean structured text with section markers
- `parse-mandalart-text` Edge Function
- Instant preview, no file upload needed

**3. Manual Template** (`MandalartCreatePage.tsx` - Manual Input tab):
- Empty 9x9 grid template
- Step-by-step guided input:
  1. Center goal
  2. 8 sub-goals
  3. 64 actions (8 per sub-goal)
- Inline editing with AI type suggestions
- Progress tracking (X/81 cells)
- Auto-save drafts to localStorage

### Navigation & Routing

**Web (React Router v6):**
- `/`: Landing page
- `/home`: Dashboard
- `/today`: Today's checklist
- `/mandalart/*`: Mandalart management
- `/settings`: Settings

**Mobile (React Navigation):**
- `MainTabs`: Bottom tab navigator (Home, Today, Mandalart, Reports)
- `Stack`: Native stack for details, auth, and modals
- **iPad Support**: Responsive layout with split view considerations

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
- `src/pages/MandalartCreatePage.tsx`: UI + all 3 input methods
- `supabase/functions/ocr-mandalart/index.ts`: Image OCR processing
- `supabase/functions/parse-mandalart-text/index.ts`: Text parsing
- `supabase/migrations/20251101000002_add_storage_policies.sql`: RLS policies

## Important Patterns

### Database Queries

Always use Row Level Security (RLS) filters:
```typescript
// Correct: User-scoped query
.from('mandalarts')
.select('*')
.eq('user_id', user.id)
.eq('is_active', true)  // Filter active mandalarts

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
.eq('sub_goal.mandalart.is_active', true)
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

**For Reports (NOT chat):**
- Single user message with full context
- System instructions embedded in prompt
- No conversation history
- Markdown output expected

```typescript
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'sonar',
    messages: [{
      role: 'user',
      content: `${systemPrompt}\n\n${userContext}\n\n${requestedAnalysis}`
    }]
  })
})
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

### XP Calculation Pattern

When awarding XP for action checks:
```typescript
import { getActiveMultipliers, calculateXPWithMultipliers } from '@/lib/xpMultipliers'

// 1. Get active multipliers for user
const multipliers = await getActiveMultipliers(userId)

// 2. Calculate XP with multipliers
const baseXP = 10  // Base XP per check
const finalXP = calculateXPWithMultipliers(baseXP, multipliers)

// 3. Award XP to user_gamification
await supabase
  .from('user_gamification')
  .update({ total_xp: currentXP + finalXP })
  .eq('user_id', userId)

// 4. Check for level up and badges
const newLevel = getLevelFromXP(currentXP + finalXP)
if (newLevel > currentLevel) {
  // Trigger level milestone multiplier
  await activateLevelMilestone(userId, newLevel)
}
```

### Badge Evaluation Pattern

Auto-evaluate badges after significant actions:
```typescript
import { evaluateAndUnlockBadges } from '@/lib/badgeEvaluator'

// After check, level up, or other milestone
const newlyUnlocked = await evaluateAndUnlockBadges(userId)

// Show toast notifications
newlyUnlocked.forEach(badge => {
  toast({
    title: "🎉 새로운 뱃지 획득!",
    description: `${badge.title} (+${badge.xp_reward} XP)`
  })
})
```

## Session Context & Documentation

**Always read these files when resuming work:**
- `docs/archive/sessions/SESSION_SUMMARY.md`: Latest session status, completed work, next steps
- `docs/project/IMPROVEMENTS.md`: Feature improvement tracking (20 items)
- `docs/project/ROADMAP.md`: Feature roadmap v3.0 and priorities
- `docs/project/PRD_mandaact.md`: Product requirements v2.0 (production status)
- `docs/features/`: Latest feature documentation
  - `BADGE_SYSTEM_V5_RENEWAL.md`: Badge system v5.0 design (planned)
  - `XP_SYSTEM_PHASE2_COMPLETE.md`: XP system implementation details
  - `ACTION_TYPE_IMPROVEMENT_V2.md`: Action type system v2
  - `NOTIFICATION_SYSTEM_PROGRESS.md`: PWA notification setup

**Current Progress (as of 2025-12-01):**
- **Mobile App Completed** ✅ (iOS/Android/iPad)
- **Monorepo Migration Completed** ✅
- **i18n Support Completed** ✅ (English/Korean)
- **Native Push Notifications Completed** ✅
- Phase 1-3 Features: Fully implemented on both Web & Mobile
- **Next Priority**: Store deployment & AdMob integration

## Documentation References

- **[UI Guidelines](./docs/guidelines/UI_GUIDELINES.md)**: Unified design patterns
- **[Build Guide](./docs/development/BUILD_GUIDE.md)**: Mobile build & troubleshooting
- **[Version Policy](./docs/development/VERSION_POLICY.md)**: Locked dependency versions
- **[Roadmap](./docs/project/ROADMAP.md)**: Project status and plans

## Testing & Deployment

**Local Testing:**
```bash
# Frontend
npm run dev  # http://localhost:5173

# Test key flows:
# 1. Sign up with test email
# 2. Complete tutorial (7 steps)
# 3. Create mandalart (try all 3 methods)
# 4. Check actions in "오늘의 실천"
# 5. Earn XP and badges
# 6. Generate weekly report
```

**Edge Function Testing:**
```bash
# View logs in real-time
supabase functions logs <name> --tail

# Check deployment status
supabase functions list

# Test specific functions
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/ocr-mandalart \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"image_url": "https://..."}'
```

**Deployment:**
- Frontend: Vercel (auto-deploy on git push to main)
- Backend: Supabase (manual deploy via CLI)
- PWA: Automatic build with Vite PWA Plugin

**Secrets Management:**
```bash
# NEVER commit secrets to .env.local
# Set in Supabase dashboard or CLI:
supabase secrets set GCP_PROJECT_ID=xxx
supabase secrets set GCP_CLIENT_EMAIL=xxx
supabase secrets set GCP_PRIVATE_KEY="$(cat key.json | jq -r .private_key)"
supabase secrets set PERPLEXITY_API_KEY=pplx-xxx
```

**PWA Configuration:**
- Manifest: `vite.config.ts` (icons, name, theme)
- Service Worker: Auto-generated by vite-plugin-pwa
- Push Notifications: Web Push API + Supabase triggers

## Common Issues & Solutions

**OCR fails with "Failed to get access token":**
- Check GCP JWT has `scope: 'https://www.googleapis.com/auth/cloud-vision'`
- Verify private key format: `privateKey.replace(/\\n/g, '\n')`

**Text parsing returns empty result:**
- Check text format (tab-separated or structured Korean)
- Ensure at least 9 lines (center + 8 sub-goals)
- View Edge Function logs for parsing errors

**XP not updating after check:**
- Verify `user_gamification` record exists for user
- Check active multipliers in `xp_multipliers` table
- Ensure RPC functions are deployed (check migrations)

**Badges not auto-unlocking:**
- Run `evaluate_badge_progress()` RPC manually for debugging
- Check `achievement_progress` table for current progress
- Verify RPC functions deployed: `unlock_achievement`, `evaluate_badge_progress`

**Monthly badges not resetting:**
- Check pg_cron schedule: `SELECT * FROM cron.job`
- Verify `perform_monthly_badge_reset()` function exists
- Manually trigger: `SELECT perform_monthly_badge_reset()`

**Navigation shows on auth pages:**
- Navigation component checks `location.pathname` and `user` state
- Should auto-hide on /, /login, /signup

**Storage upload fails:**
- Check RLS policies exist: `20251101000002_add_storage_policies.sql`
- Verify bucket name: `mandalart-images`
- User must be authenticated

**PWA not installable:**
- Check manifest in `vite.config.ts`
- Verify HTTPS (required for PWA)
- Check browser DevTools → Application → Manifest

## Terminology (Korean)

Consistent UI terminology (established in Phase 1-2):
- "만다라트 관리" (not "내 만다라트" or "만다라트 목록")
- "오늘의 진행상황" (not "진행상황" or "오늘의 진행률")
- "오늘의 실천" (Today's practice page)
- "실천하러 가기" (Quick link to today's practice)
- "이번 주 리포트" (Weekly report)
- "목표 진단" (Goal diagnosis)

## Performance Considerations

**Current Bundle Size:** ~1.33MB (needs optimization)

**Optimization Opportunities:**
- Code splitting with React.lazy
- Tree shaking verification
- Image optimization (WebP, lazy loading)
- TanStack Query caching improvements
- React.memo for expensive components

**Target Metrics:**
- Lighthouse Performance > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s

## Security Notes

**RLS Policies:** All tables have user-scoped RLS policies
- `mandalarts`: user_id check
- `sub_goals`, `actions`: via mandalart.user_id
- `check_history`: user_id + action.sub_goal.mandalart.user_id
- `user_gamification`, `user_achievements`: user_id check

**Edge Function Security:**
- Always use ANON_KEY (not SERVICE_ROLE) for user-scoped operations
- JWT validation via `getUser(jwt)` on every request
- Rate limiting on AI endpoints (prevent abuse)

**Anti-Cheat Measures:**
- Daily check limit per action (3x)
- 10-second cooldown between checks
- Spam detection in XP system
- Server-side validation for all XP awards
