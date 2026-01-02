# AI Mandalart Coaching - Service Milestone

> Document purpose: This file is the living milestone for the AI Mandalart Coaching re-review and redesign. It captures decisions, current spec, and future updates. Use this for implementation tracking and progress checks.

## 1.1) Constitutional Rules for AI Coaching
To ensure a transformative experience, the AI must adhere to these "Golden Rules":

1.  **The "Objective Provocateur"**: Never accept a goal at face value. Search for contradictions and "Socially Desirable" lies.
2.  **System-First Architecture**: Designing the "Safety Net" (Emergency Mode) is as important as the Mandalart itself.
3.  **Mathematical Logic Enforcement**: Perform feasibility math on every numeric claim (e.g., Revenue = Customers * Rate - Churn).
4.  **Linguistic Filtering (Noun-to-Verb)**: Reject nouns. Reject slogans. Every action must start with a specific verb and numeric metric.
5.  **Small-Step Interrogation**: If a task looks too big (>4 hours), force the user to define the first 30-minute micro-action.
6.  **Progressive Interaction (One by One)**: Maintain a strict 1-input-1-response rhythm to minimize cognitive load.
7.  **Habit vs. Task Separation**: Explicitly distinguish between daily repetitions and one-off milestones for realistic scheduling.

## 1.3) AI Coaching Strategy: The Moat (차별화 전략)
MandaAct AI 코치만이 가질 수 있는 독보적인 경쟁 우위입니다.

1. **기억력 (The Ego)**: 일회성 세션이 아닌, 사용자의 장기적인 성공/실패 패턴을 기억합니다.
2. **교차 검증 (The Mirror)**: 대화 내용과 실제 실천 데이터(XP, 스트릭)를 대조하여 피드백합니다.
3. **능동적 개입 (The Push)**: 사용자가 말이 없어도 실천율 저하 시 먼저 상황을 묻고 대안을 제안합니다.
4. **구조적 규율 (The Frame)**: 만다라트 그리드라는 강력한 프레임워크 내에서만 사고하도록 강제합니다.
5. **적응형 페르소나 (Adaptive Mode)**: 사용자의 멘탈/데이터 상태에 따라 **가디언/사이언티스트/챌린저** 모드를 전환합니다.

## 1.4) Evolution Roadmap: Step-by-Step Expansion
1. **Phase 1 (Current)**: '안전망(Emergency Action)' 데이터 확보 및 저장.
2. **Phase 2 (Moat Basis)**: 스트릭 실패 등 특정 조건(Event-triggered) 발생 시 AI 코치가 능동적으로 개입.
3. **Phase 3 (Full Moat)**: 장기 누적 데이터를 기반으로 한 개인화된 통계 분석 및 전략적 조언 제공.
4. **Phase 4 (Premium)**: 수익화 모델(Premium)과 연동하여 고도화된 능동 코칭 기능 제공.

## 1.5) Reflection: Why the current approach feels like a "Trap"
- **Forced Linear Path**: Users are forced through steps (1 to 7) without the ability to jump around or skip.
- **Multiple Choice Fatigue**: Asking 5-6 rigid questions before even discussing the goal creates cognitive load and feels like a survey.
- **Validation Blockers**: Requiring 8 sub-goals and 24 actions to be "perfectly configured" before saving creates a high barrier to entry.
- **Transactional AI**: AI is triggered by buttons (Generate) rather than being a continuous participant in the thought process.

## 1.1) Terminology
- **Session**: one full 7-day coaching flow.
- **Active action**: the single action per sub-goal shown in Today checklist.
- **Inactive action**: alternative actions (minimum/challenge) not shown by default.
- **Minimum today**: a day-only toggle that temporarily switches active actions to minimum variants.

## 2) Scope & Personas
- Primary focus: working professionals.
- Secondary focus: students and freelancers.
- Additional: a manual "custom" persona for cases that do not fit predefined roles.

## 3) History Review (Current State)
- Conversational AI coaching existed historically but was removed in favor of weekly AI reports.
- Roadmap keeps AI coaching as an optional reintroduction item.
- Prior setup used Supabase Edge Function + Perplexity API with chat sessions and messages.

## 4) Principles
- Tone: warm, supportive, non-judgmental.
- UX: no hard-stop mid-session; avoid clutter in Today screen.
- Realism: prioritize feasible actions over aspirational wording.

## 5) Service Flow

### 5.1 Entry UX (Persona Selection)
- Header: "Let's start with your current situation"
- Persona cards (4):
  - Working professional
  - Student
  - Freelancer
  - Custom input
- Note: user can change later. Entry is the start of Step 1.

### 5.2 Coaching Flow (Dynamic Discovery)
Instead of a fixed 7-step wizard, we move to a **Chat-First Discovery**:
1.  **Opening Dialogue**: "Tell me about your goal and your typical day."
2.  **Context Extraction**: AI parses name, persona, available time, and energy peak from the chat.
3.  **Incremental Build**: As the user agrees on goals, the Mandalart visualises them in a side-drawer or mini-preview.
4.  **No Hard Stops**: "Save as Draft" is always available. 8 sub-goals are *recommended* but not mandatory to exit.

### 5.3 Screen Flow (Unified View)
- **Top**: Mini-Mandalart progress visualizer.
- **Center**: Conversational Chat Interface.
- **Bottom**: Smart Suggestion Chips (e.g., "I'm a student", "Work is my priority", "Let's stick to 4 sub-goals").

### 5.4 Coaching Pipeline (End-to-End)
1) Collect answers (Question sets)
2) Apply sub-goal recommendation rules
3) Generate action items
4) Run reality check corrections
5) Set active vs inactive actions
6) Save summaries for resume card

## 6) Inputs & Questions

### 6.1 Context Extraction (Dialog Parsing)
Instead of fixed question sets, we define **Information Slots** the AI needs to fill:
- **Mandatory**: Core Goal, Persona (Working/Student/etc.).
- **Dynamic**: Available Time, Energy Peak, Priority Area, Potential Obstacles.

The AI will ask about these naturally if not provided in the opening message.

### 6.2 Validation Policy (Simplified)
- **Minimum for Save**: 1 Core Goal + 1 Sub-goal.
- **Recommended**: 8 Sub-goals + 3 Actions each.
- **Policy**: Never block a user from saving a "Work in Progress" plan.

### 6.2 Input Variable Mapping (Questions -> Rules)
- Available time -> Action duration rules, daily action cap, capacity corrections
- Energy peak -> Timing suggestions, energy-time mismatch correction
- Priority area -> Sub-goal prioritization
- Schedule variability (freelancer) -> Weekly frequency vs fixed days
- Goal style (maintain/challenge) -> Difficulty adjustment
- Obstacle (free text) -> Custom obstacle mitigation

## 7) Recommendation & Generation

### 7.1 Sub-Goal Recommendation Rules

#### Common Rules
- 8 sub-goals total: 4 core + 2 maintenance + 2 flexible.
- Prioritize user-provided "priority area".
- Adjust difficulty using time, energy, and stability inputs.

#### Working Professional
- Core: priority area + work/health/learning balance.
- Maintenance: life admin + relationships.
- Flexible: recovery + hobby/other.
- Time <= 30 min: limit to 1 daily action. Time >= 60 min: allow 2.

#### Student
- Core: grades or career + study routine + assignment management + health.
- Maintenance: sleep + recovery.
- Flexible: club/social/hobby.
- Exam period: heavier study weight, reduce flexible.

#### Freelancer
- Core: income/delivery + pipeline + skill growth + client comms.
- Maintenance: health + daily routine.
- Flexible: recovery + market exploration.
- High variability: prefer weekly targets, avoid fixed weekdays.

#### Custom Input
- Map keywords to target domains (e.g., childcare -> family/time/health).
- Fill remaining slots with health/life/relationships.
- Goal style: maintain reduces difficulty; challenge increases difficulty.

### 7.2 Action Item Auto-Generation Rules

#### Common Rules
- 3 actions per sub-goal by default: baseline / minimum / stretch.
- Allow expansion on demand: users can add more actions per sub-goal via coaching.
- Format: verb + time/quantity + condition.
- Avoid vague verbs ("try", "work hard").
- Do not exceed 2 actions per day in total for low time users.
- Only one action per sub-goal is marked as “active”; others are optional/fallback.
- Daily active actions are capped at 1-2; extra actions remain inactive until scheduled or explicitly activated.
 - Each action must include a type + frequency plan before save (no unconfigured actions).

#### Working Professional
- Time 10-30: 10-20 minute actions.
- Time 60+: 30-40 minute actions.
- Energy peak preference sets action timing.

#### Student
- Exams: review/problem practice focus.
- Projects: deliverables + collaboration focus.
- Keep minimum variant for high workload weeks.

#### Freelancer
- High variability: weekly targets.
- Income priority: include outreach/proposal actions.
- Routine focus: repeatable daily actions.

#### Custom Input
- Use keyword template mapping (e.g., "job search" -> portfolio, study, outreach).
- If "obstacle" is large, increase minimum action weight.

### 7.2.1 Action Type & Frequency Auto-Setting
- Parse phrases like “daily/weekly/3x/week” into routine_frequency and routine_weekdays.
- If completion criteria exists (e.g., “finish report”), map to mission type.
- Default fallback:
  - type: routine
  - frequency: 3x/week (or 1x/week for low time/low energy users)
- Weekday assignment:
  - 1-2x/week -> no fixed weekdays by default.
  - 3x/week -> suggest Mon/Wed/Fri (editable).
  - Daily -> no weekday field required.

### 7.2.2 Pre-Save Validation
- Block save if any action remains unconfigured.
- Show a summary: “All actions have type & frequency set.”

### 7.2.3 Pre-Save Review UX
- **Checklist**: type set, frequency set, daily active cap respected.
- **If missing**: show warning + offer “Auto-set defaults” or “Edit manually.”
- **Summary card**: core goal, 8 sub-goals, active actions overview.
- **Final CTA**: “Save as is” / “Adjust.”
- **Edit manual route**: deep-link to Plan modal or action settings screen for the specific sub-goal.
- **Post-save notice**: “You can adjust type/frequency later; changes apply to Today immediately.”

### 7.3 Reality Check Rules (Correction Triggers)
- Frequency too high (e.g., 5+ per week) -> suggest reduction.
- Vague action text -> convert to measurable form.
- Time overload (3+ actions/day) -> reduce to 1-2.
- Energy mismatch (late actions when evening energy is low) -> suggest shift.

### 7.4 Reality Check Auto-Correction Logic (Rules + Examples)

#### A) Frequency Overload
**Rule**: If an action repeats 5+ times/week, reduce to 2-3x/week (baseline) unless user explicitly marks it as primary.
**Example**: "Workout every day" -> "Workout 3 times a week (Mon/Wed/Fri)".

#### B) Duration Mismatch
**Rule**: If available time <= 30 minutes, cap single actions to 10-20 minutes.
**Example**: "Study 1 hour daily" -> "Study 20 minutes daily".

#### C) Daily Action Count Cap
**Rule**: If total planned actions per day > 2 (for low time) or > 3 (for high time), reduce by merging or removing lowest priority.
**Example**: "Walk + Journal + Read + Stretch" -> "Walk + Journal".

#### D) Vague Wording
**Rule**: Replace ambiguous verbs with measurable units.
**Example**: "Exercise more" -> "Walk 20 minutes".

#### E) Energy-Time Mismatch
**Rule**: If action timing conflicts with energy peak, shift to peak window.
**Example**: "Deep work at night" + energy peak morning -> "Deep work before work".

#### F) Long-Term Goal Without Short-Term Anchor
**Rule**: If a goal spans 3+ months, add a weekly checkpoint or small milestone.
**Example**: "Get certified in 3 months" -> "Complete 1 module per week".

#### G) Schedule Variability (Freelancers)
**Rule**: High variability -> replace fixed weekdays with frequency-based targets.
**Example**: "Every Tue/Thu" -> "Twice per week".

#### H) High Stress / Low Energy Mode
**Rule**: If energy score <= 4, auto-generate minimum viable actions.
**Example**: "Gym session" -> "10-minute stretch".

#### I) Custom Obstacle Mitigation
**Rule**: If user lists a major obstacle (e.g., childcare, shift work), reduce action size or move to flexible windows.
**Example**: "Read 30 mins nightly" -> "Read 10 mins during lunch".

### 7.5 User Rejection Flow (When a user rejects corrections)

#### Principles
- Respect user intent, but require an explicit acknowledgment of risk.
- Offer a smaller alternative (“minimum version”) without blocking.
- Record rejection for later coaching check-ins.

#### Flow
1) **Correction suggestion** (soft prompt):
   - "This looks a bit heavy for your current time. Want to adjust?"
2) **User chooses**:
   - "Adjust" -> apply recommended correction.
   - "Keep as is" -> proceed with caution.
3) **If Keep as is**:
   - Show “risk note” + minimum version:
     - "Okay. Just in case, here’s a minimum version you can fall back to."
4) **Save both**:
   - Primary action (user choice)
   - Minimum action (fallback)
5) **Follow-up trigger**:
   - If user fails 2+ times in a week, prompt: "Should we lower this a bit?"

#### Example
- Suggestion: "Workout daily" -> "3x/week".
- User: "Keep daily".
- Response: "Got it. If it gets tight, use a 10-minute stretch as fallback."

### 7.6 Correction Rule Priority & Conflict Resolution

#### Priority Order (Apply Top-Down)
1) Safety/Capacity (energy <= 4 or time <= 30 mins)
2) Time overload (daily action count cap)
3) Frequency overload (5+ per week -> reduce)
4) Energy-time mismatch (shift to peak window)
5) Vague wording (make measurable)
6) Long-term anchor (weekly checkpoint)
7) Schedule variability (frequency-based targets)

#### Conflict Resolution Rules
- Capacity overrides all: reduce duration before changing frequency.
- Time overload before frequency: reduce actions/day first, then weekly frequency.
- Energy mismatch after resizing: adjust timing only after size/frequency fixes.
- Vague wording last: preserve intent until structure is stable.

#### Example
Input: "Study 1 hour nightly + Workout daily" with time 30 mins, energy peak morning.
- Capacity -> reduce to 20 mins.
- Time overload -> keep 1 action per day.
- Frequency overload -> workout 3x/week.
- Energy mismatch -> move study to morning.
- Vague wording -> ensure measurable units.

### 7.7 Active/Inactive Action UX (Summary)
- Only active actions appear in Today check.
- Inactive actions are shown under "Options" per sub-goal.
- Users can swap active action or apply minimum version for the day.

### 7.8 Action Expansion UX (User-Friendly)
- **Primary prompt timing**: after Step 4 (actions draft) and again at Step 7 (final review).
- **Prompt copy**: “더 추가하고 싶은 실천이 있나요? 원하면 함께 채워볼게요.”
- **Choice**:
  - “지금 추가하기” -> open add-action flow for selected sub-goal.
  - “나중에 추가하기” -> save and allow edits in Mandalart detail.
- **Guardrail**: additional actions are created as inactive by default, and must be explicitly activated.

#### Add-Action UI (Concrete)
- **Entry**: tap “지금 추가하기” -> sub-goal selector (list of 8).
- **Input**: single-line action input with suggestions below.
- **Auto-format**: enforce verb + time/quantity (e.g., “20분 걷기”).
- **CTA**: “추가하기” + “완료” (finish adding).
- **Post-add**: show as inactive with “옵션(대안)” label.
- **Priority**: added actions are always inactive and never auto-activated.

#### Add-Action Copy (KO/EN)
- KO Prompt: "더 추가하고 싶은 실천이 있나요?"
- EN Prompt: "Want to add a few more actions?"
- KO CTA: "지금 추가하기"
- EN CTA: "Add Now"
- KO Placeholder: "예: 매일 10분 스트레칭"
- EN Placeholder: "e.g. 10-minute stretch daily"

## 8) UX & UI

### 8.1 Design Notes (Layout)
- Header + progress indicator (Step X/Y)
- Card-based questions
- Primary CTA fixed at bottom
- Secondary CTA for pause/resume

### 8.2 Today Header Toggle (Minimum Today)
- **Placement**: below Today header, above the main list (non-sticky).
- **Content**: label "오늘은 최소 버전으로 진행" + toggle.
- **Helper**: "AI 코칭 만다라트에만 적용돼요".
- **Setting link**: small text button "설정" opens Plan modal.
- **Visibility**: only if user has at least one AI-coached Mandalart.
- **Deep-link behavior**:
  - Tap "설정" -> open most recent AI-coached Mandalart -> open Plan modal.

### 8.3 Mandalart Detail UX (Plan/Edit) - Concrete
- **Entry**: From Mandalart detail, expand a sub-goal and tap “Edit/Plan.”
- **Action Selector**:
  - Display 3 actions with radio-style selection:
    - “기본(Active)” / “최소” / “도전”
  - Selecting one makes it the active action for Today.
- **Labels**:
  - Active badge on selected action.
  - Inactive actions shown as “옵션(대안)” with lighter text.
- **Safety**:
  - Switching active action shows a small inline hint:
    - “오늘부터 기본 실천이 이 항목으로 변경됩니다.”

### 8.4 Plan Modal Wire (Layout Details)
- **Header**: "실천 플랜 선택" + subtext "한 번에 하나만 활성화됩니다"
- **Body**: 3 action cards with radio select (기본/최소/도전)
- **Option**: Toggle "오늘만 적용" with helper text
- **Footer**: Primary CTA "오늘부터 적용하기" (full width, 52px, radius 16px) + secondary "취소"

### 8.5 Discovery & Reminder UX (AI Coaching Only)
- **First-time nudge**: After completing AI coaching, show a one-time tooltip near Plan button: "오늘 컨디션에 맞춰 최소/도전으로 바꿀 수 있어요."
- **Detail header badge**: Add a subtle "AI 코칭 전용" badge on the Plan button.
- **Optional deep-link**: If user taps "Minimum today" on Today header, deep-link to the Plan modal (only for AI-coached mandalarts).
- **Avoid extra clutter**: No permanent banners; use dismissible tooltip and lightweight badge.

### 8.6 Challenge Mode Usage
- Challenge mode is used when the user has extra time or energy (e.g., weekends).
- It is controlled in the Plan modal only (no Today-level toggle to avoid clutter).
- If selected, it becomes the active action for the sub-goal until changed back.

### 8.7 Localized Copy Set (KO/EN Draft)

#### Entry & Persona Selection
- KO: "지금 상황을 알려주세요"
- EN: "Let's start with your current situation"
- KO: "직장인"
- EN: "Working professional"
- KO: "학생"
- EN: "Student"
- KO: "프리랜서"
- EN: "Freelancer"
- KO: "직접 입력"
- EN: "Custom"
- KO: "언제든 바꿀 수 있어요"
- EN: "You can change this anytime"

#### Core Flow
- KO: "오늘 몇 분만"
- EN: "Just a few minutes today"
- KO: "당신의 중심 목표"
- EN: "Your core goal"
- KO: "핵심 8가지 영역"
- EN: "The 8 areas that matter"
- KO: "작은 실천부터"
- EN: "Start with small, doable actions"
- KO: "현실성 체크"
- EN: "Reality check"
- KO: "주간 루틴"
- EN: "Your weekly routine"
- KO: "완성된 만다라트"
- EN: "Your Mandalart, ready to use"

#### Correction Prompts
- KO: "지금 상황에선 조금 빡빡해 보여요. 줄여볼까요?"
- EN: "This feels a bit heavy for your current time. Want to scale it down?"
- KO: "괜찮아요. 최소 버전도 충분히 의미 있어요."
- EN: "That's okay. The minimum version still counts."
- KO: "필요하면 언제든 조정할 수 있어요."
- EN: "You can adjust anytime."

## 9) Data & Persistence

### 9.1 Session Persistence Model (Save/Resume)

#### Entities (Conceptual)
- coaching_sessions
  - id (uuid), user_id
  - persona_type (employee/student/freelancer/custom)
  - status (active/paused/completed)
  - current_day (int), current_step (string)
  - timezone (iana, e.g. "Asia/Seoul")
  - created_at, updated_at, last_resumed_at
  - session_type (full-flow)
- coaching_steps
  - id, session_id
  - day_index, step_key
  - state (not_started/in_progress/completed)
  - completed_at
- coaching_answers
  - id, session_id, step_key
  - answer_payload (json)
  - created_at
- coaching_summaries
  - session_id
  - short_summary (text) for resume card
  - next_prompt_preview (text)
  - updated_at

#### Save Rules
- Auto-save on every answer input.
- On leaving a step, mark step as completed and update summary.
- Resume card pulls from coaching_summaries.
- All scheduling uses session timezone for day boundaries.

#### Resume Rules
- If session status=active, resume at current_step.
- If last_resumed_at > 7 days, show a brief recap screen before continuing.
- “Next day” transition uses session timezone day rollover.

#### Local Cache
- Store last summary and current step in local storage for instant UI.
- Sync with server on reopen.

### 9.2 Screen-to-Data Mapping
- Step 1 Persona -> coaching_sessions.persona_type
- Steps 1-6 answers -> coaching_answers(step_key)
- Step 7 finalization -> coaching_sessions.status=completed + final summary
- Resume card -> coaching_summaries.short_summary + next_prompt_preview
- Progress state -> coaching_steps.state + coaching_sessions.current_step

## 9.3 Backend Integration Checklist
- Enforce action type/frequency constraints at DB or API level.
- Validate no unconfigured actions on save.
- Persist coaching_sessions / coaching_answers with RLS policies.
- Update step completion state server-side for resume stability.
- Ensure coaching result -> mandalart creation is atomic (transaction or retry-safe).

### 9.3.1 DB Constraints (Draft)
- `actions.type` should be required (`routine|mission|reference`).
- If `type=routine`: require `routine_frequency` (and `routine_weekdays` when needed).
- If `type=mission`: require `mission_completion_type`.
- Add `is_active` boolean (one active per sub-goal).
- Optional: store `variant` (`base|min|challenge`) for AI-coached actions.
 - Implementation note: defer to execution phase; must be included in migration/RLS updates.

## 10) Monetization & Limits

### 10.1 Access Policy
- New users: 1 full coaching session (full 7-day flow) free, included in the weekly free session.
- Free tier after first: 1 free session per week, plus 1 ad-unlocked session (max 2 per week).
- Premium: unlimited sessions.
- Slot policy (free users at limit): require delete-before-start (no overwrite).

### 10.2 Gate Decision Logic (Conditions)
- If user at free slot limit -> show delete flow gate
- Else if weekly free session used -> show ad gate
- Else -> start coaching session

### 10.3 Gate UI & Copy

#### Session Start Gate (Free User)
- Title: "Start AI Coaching"
- Body: "Your first session counts toward this week's free session."
- CTA Primary: "Watch an Ad to Start"
- CTA Secondary: "Go Unlimited"
- Subtext: "No ads during your session."

#### Session Start Gate (First-time User)
- Title: "Welcome Gift"
- Body: "Your first coaching session is on us."
- CTA Primary: "Start Now"
- Subtext: "Finish at your own pace."

#### Limit Reached (Free User)
- Title: "Weekly sessions used"
- Body: "You can start again next week, or watch an ad to unlock one now."
- CTA Primary: "Watch Ad"
- CTA Secondary: "Upgrade"

#### Premium Upsell Banner (Optional)
- Copy: "Unlimited AI coaching sessions"
- CTA: "Go Premium"

#### Gate Screen Layout (Structure)
- **Top**: title + short supporting text
- **Center**: value card (free session status or welcome gift)
- **Bottom fixed**: primary CTA (watch ad / start now)
- **Below primary**: secondary CTA (upgrade)
- **Footer microcopy**: "No ads during session"

#### Button Placement
- Primary CTA: full-width, bottom fixed
- Secondary CTA: text button directly below primary
- Close/dismiss: top-left back icon (only for non-first-time users)

#### Gate Copy (KO/EN)
- KO Title: "AI 코칭 시작"
- EN Title: "Start AI Coaching"
- KO Body: "주 1회 무료 + 광고 1회로 최대 2회 이용할 수 있어요."
- EN Body: "Get 1 free session per week plus 1 ad-unlocked session (max 2)."
- KO CTA Primary: "광고 보고 시작"
- EN CTA Primary: "Watch an Ad to Start"
- KO CTA Secondary: "무제한으로 업그레이드"
- EN CTA Secondary: "Go Unlimited"
- KO Subtext: "세션 중에는 광고가 나오지 않아요"
- EN Subtext: "No ads during your session"

#### Slot Check Gate (Free User at Limit)
- KO Title: "만다라트 공간이 가득 찼어요"
- EN Title: "Your Mandalart slots are full"
- KO Body: "AI 코칭을 시작하려면 하나를 삭제해야 해요."
- EN Body: "To start coaching, delete one Mandalart first."
- KO CTA Primary: "만다라트 삭제하고 시작"
- EN CTA Primary: "Delete One to Start"
- KO CTA Secondary: "무제한으로 업그레이드"
- EN CTA Secondary: "Go Unlimited"
- KO Subtext: "삭제 후 되돌릴 수 없어요"
- EN Subtext: "Deletion cannot be undone"

#### Delete Flow UI (Before Coaching Start)
- **Step 1: Select Mandalart to delete**
  - List view with title, created date, last active.
  - Warning text: "This will free 1 slot for AI coaching."
  - CTA: "Delete Selected"
- **Step 2: Confirmation modal**
  - Title: "Delete this Mandalart?"
  - Body: "This action cannot be undone."
  - CTA Primary: "Delete"
  - CTA Secondary: "Cancel"
- **Step 3: Post-delete state**
  - Toast: "Deleted. You can now start AI coaching."
  - Auto-redirect to coaching start gate.

#### Delete Flow Copy (KO/EN)
- KO Step 1 Title: "삭제할 만다라트를 선택해주세요"
- EN Step 1 Title: "Select a Mandalart to delete"
- KO Warning: "AI 코칭을 시작하려면 1개를 삭제해야 해요"
- EN Warning: "Delete one to start AI coaching"
- KO CTA: "선택한 만다라트 삭제"
- EN CTA: "Delete Selected"

- KO Confirm Title: "만다라트를 삭제할까요?"
- EN Confirm Title: "Delete this Mandalart?"
- KO Confirm Body: "삭제 후 되돌릴 수 없어요"
- EN Confirm Body: "This action cannot be undone"
- KO Confirm CTA: "삭제"
- EN Confirm CTA: "Delete"
- KO Cancel CTA: "취소"
- EN Cancel CTA: "Cancel"

- KO Toast: "삭제 완료. 이제 AI 코칭을 시작할 수 있어요."
- EN Toast: "Deleted. You can now start AI coaching."

### 10.4 Cost Control & Message Limits
- Daily message cap: soft limit (warn only), no hard stop mid-session.
- Session timeout: 30 minutes idle -> auto-pause.
- Max context window: last 10 messages.
- If user exceeds daily cap, show a gentle notice and allow completion.
- High-cost sessions trigger shorter replies (1-2 paragraphs).
- Safety valve: if API errors or costs spike, fall back to template guidance (no LLM call).

## 11) KPIs & Quality

### 11.1 KPI & Coaching Quality Metrics (Draft)

#### Activation & Completion
- Coaching start rate (from entry view)
- Step 1 completion rate
- Full flow completion rate (Step N)

#### Quality & Realism
- Correction suggestion acceptance rate
- Post-correction success rate (actions checked within 7 days)
- “Too hard” feedback rate

#### Retention
- Step 2 return rate
- 7-day retention after coaching start
- Resume completion rate (after pause > 24 hours)

#### Efficiency
- Avg. time per day session
- Avg. total days to completion
- Avg. total actions created

### 11.2 KPI-to-Feature Map
- Step 1 completion rate -> number of questions + time estimate copy
- Resume completion rate -> resume card visibility + next prompt preview quality
- Correction acceptance rate -> correction phrasing tone + minimum version clarity

## 11.3 Cost & Revenue Tracking (Go/No-Go)
- Track LLM cost per session (input/output tokens + unit cost).
- Track rewarded ad revenue per session unlock (eCPM + fill).
- Maintain weekly margin estimate: (ad revenue + premium attribution) - LLM cost.
- Define a go/no-go threshold after 4 weeks of data.

### Metrics to Log
- avg_tokens_in, avg_tokens_out per session
- cost_per_session (USD)
- rewarded_ad_ecpm by country
- fill_rate
- revenue_per_ad (USD)
- revenue_per_session_unlock (USD)

### Simulation Template (Estimates)
| Variable | Value | Notes |
|---|---:|---|
| Avg input tokens / session |  |  |
| Avg output tokens / session |  |  |
| LLM cost per 1M input tokens |  |  |
| LLM cost per 1M output tokens |  |  |
| Estimated LLM cost / session |  |  |
| Rewarded ad eCPM |  |  |
| Fill rate |  |  |
| Revenue per ad |  | eCPM/1000 * fill |
| Sessions unlocked per ad | 1 | Fixed |
| Revenue per session unlock |  |  |

## 12) Legal/Ethical Boundaries (Draft)

### Scope Statement
- This service provides goal planning and habit support.
- It is not medical, psychological, financial, or legal advice.

### Guardrails
- If user requests medical/mental health diagnosis, respond with a gentle redirect.
- If user indicates crisis/self-harm, show emergency guidance and stop coaching.
- Avoid prescriptive statements about medications or treatment plans.

### UX Placement
- Show a brief disclaimer on first coaching entry.
- Add a “Learn more” link in settings or FAQ.

## 13) LLM Ops

### 13.1 LLM Comparison Process (Pre-Launch)

#### Goals
- Compare 2-3 LLMs for coaching quality and cost.
- Decide a primary model and a fallback model before launch.

#### Scope
- Evaluate on the same prompt templates and test scenarios.
- Focus on: realism correction, action specificity, tone consistency, and latency.

#### Evaluation Criteria
- **Quality**: clarity, realism, actionable outputs, tone alignment.
- **Safety**: avoids medical/legal advice, handles sensitive inputs gracefully.
- **Cost**: estimated cost per full 7-day flow.
- **Performance**: average response time.

#### Test Set
- 6 core scenarios (2 per persona + 2 custom edge cases).
- Include: low time/low energy, over-ambitious goals, schedule variability.

#### Procedure
+1) Run identical inputs for each LLM.
+2) Score outputs using a 1–5 rubric per criterion.
+3) Record cost per response and total flow cost.
+4) Select primary + fallback model.

#### Scoring Rubric (1–5)
- **Realism correction**: detects and adjusts over-ambitious plans.
- **Action specificity**: clear, measurable, time-bound actions.
- **Tone consistency**: warm, supportive, non-judgmental.
- **Context use**: uses persona/time/energy inputs correctly.
- **Safety compliance**: avoids medical/financial/legal advice.
- **Latency**: response speed within acceptable range.

#### Comparison Table Template
| Model | Quality Avg | Safety | Cost / Session | Latency | Notes |
|---|---:|---:|---:|---:|---|
| Model A |  |  |  |  |  |
| Model B |  |  |  |  |  |
| Model C |  |  |  |  |  |

### 13.2 System Prompt Optimization (Post-Model Selection)

#### Goal
- Reduce token usage without degrading quality or safety.

#### Process
1) Start from the baseline prompt that scored best in comparison.
2) Remove redundant instructions and merge overlapping constraints.
3) Replace verbose examples with compact templates.
4) Introduce short, structured output schema to reduce extra text.
5) Run A/B tests on 6 core scenarios to confirm quality parity.

#### Guardrails
- Do not remove safety or correction directives.
- Maintain tone and persona rules.

#### Output
- Record baseline vs optimized prompt token counts and quality scores in this document.

#### Result Log Template
| Version | Tokens | Quality Score (avg) | Notes |
|---|---:|---:|---|
| Baseline |  |  |  |
| Optimized v1 |  |  |  |
| Optimized v2 |  |  |  |

## 13.3 Prompt Foundations (Draft)

### Context JSON Schema (Draft)
```json
{
  "session": {
    "id": "uuid",
    "step": 1,
    "persona": "working_professional | student | freelancer | custom",
    "timezone": "Asia/Seoul"
  },
  "inputs": {
    "available_time": "10|30|60|90|120",
    "energy_peak": "morning|lunch|evening",
    "priority_area": "work|health|learning|relationships|life|other",
    "schedule_variability": "low|medium|high",
    "goal_style": "maintain|balanced|challenge",
    "obstacle": "string"
  },
  "state": {
    "core_goal": "string",
    "sub_goals": ["string"],
    "actions": [
      { "sub_goal": "string", "active": "string", "minimum": "string", "challenge": "string" }
    ]
  },
  "history": {
    "last_summary": "string",
    "corrections_rejected": 0
  }
}
```

### System Prompt Draft (Summary)
- Role: warm, supportive coach for Mandalart planning.
- Output: concise, actionable, measurable steps.
- Do: correct unrealistic plans, ask clarifying questions.
- Do not: medical/legal/financial advice; do not shame.
- Use context JSON; respect persona and time/energy constraints.

### Step Directive Template
```
Step {n} objective:
- Ask the minimum number of questions needed to complete this step.
- If answers are missing, request them.
- If corrections are needed, apply correction rules and confirm.
Return: short prompt + next action.
```

### Context Delivery Strategy (Hybrid)
- Send minimal context every turn: session_id, step, persona, last_summary, current_step_inputs.
- Send full JSON on step transitions and after long pauses (e.g., 24h+).
- Do not rely on vendor caching for correctness; server state is source of truth.

### Step Prompt Examples (Draft)

**Step 1 (Persona + Situation Check)**
```
Given context JSON:
- If persona is missing, ask the user to select it first.
- Ask 3 concise questions: available time, energy peak, priority area.
Output: warm, short prompt that feels easy to answer.
```
Sample (KO): "먼저 현재 상황을 선택해볼까요? 직장인/학생/프리랜서/직접 입력 중 하나를 골라주세요. 그리고 하루에 쓸 수 있는 시간과 에너지가 높은 시간대를 알려주세요."
Sample (EN): "First, pick your situation (working professional/student/freelancer/custom). Then tell me your available time per day and when your energy is highest."

**Step 2 (Core Goal Confirmation)**
```
Given context JSON:
- Summarize the user's desired change in 1 sentence.
- Ask for confirmation or a small edit.
- If too vague, propose a tighter version.
Output: confirm core goal + ask for approval.
```
Sample (KO): "정리하면, '3개월 안에 업무 역량을 높이면서 주 3회 운동 루틴을 만든다'가 핵심 목표에요. 이대로 괜찮을까요?"
Sample (EN): "So your core goal is: 'Build work skills and establish a 3x/week workout routine in 3 months.' Does that sound right?"

**Step 3 (Sub-Goals Draft)**
```
Given context JSON:
- Propose 6-8 sub-goal areas aligned to persona and priority area.
- Ask the user to choose or rename them.
Output: concise list + confirm.
```
Sample (KO): "아래 8개 영역을 제안해요. 마음에 드는 이름으로 바꿔도 괜찮아요: 업무 역량, 건강, 학습, 관계, 생활관리, 회복, 취미, 기타."
Sample (EN): "Here are 8 areas to start: Work skills, Health, Learning, Relationships, Life admin, Recovery, Hobby, Other. Feel free to rename any."

**Step 4 (Action Drafts)**
```
Given context JSON:
- For each sub-goal, draft 3 actions (active/minimum/challenge).
- Keep actions measurable and small.
Output: brief action sets; ask which to set as active if needed.
```
Sample (KO): "건강 영역: 기본(주 3회 20분 걷기) / 최소(매일 10분 스트레칭) / 도전(주 2회 40분 운동). 기본을 활성으로 둘까요?"
Sample (EN): "Health: Base (20-min walk 3x/week) / Minimum (10-min stretch daily) / Challenge (40-min workout 2x/week). Set Base as active?"

**Step 5 (Reality Check)**
```
Given context JSON:
- Apply correction rules if actions are too frequent/long/vague.
- Explain changes in a supportive tone.
Output: corrected version + ask for acceptance.
```
Sample (KO): "현재 시간에 비해 조금 무거워 보여서 '매일 운동'을 '주 3회'로 줄였어요. 괜찮을까요?"
Sample (EN): "This feels a bit heavy for your time, so I reduced 'daily workouts' to '3x/week.' Is that okay?"

**Step 6 (Routine Setup)**
```
Given context JSON:
- Suggest a weekly routine for active actions.
- Offer a “minimum today” fallback rule.
Output: simple schedule + confirm.
```
Sample (KO): "월/수/금 저녁에 걷기를 넣고, 바쁜 날은 10분 스트레칭으로 대체하면 어떨까요?"
Sample (EN): "How about walks on Mon/Wed/Fri evenings, with 10-minute stretches on busy days?"

**Step 7 (Final Review & Save)**
```
Given context JSON:
- Summarize core goal + sub-goals + active actions.
- Ask for final confirmation to save.
Output: short summary + save prompt.
```
Sample (KO): "핵심 목표와 8개 영역, 활성 실천을 정리했어요. 이대로 저장할까요?"
Sample (EN): "I’ve summarized your core goal, 8 areas, and active actions. Ready to save?"

## 14) Open Questions
- What is the baseline cost control for long conversations?
- Should we allow skipping persona selection?

## 15) Implementation Checklist (Living)
- [ ] Persona selection screen
- [ ] Coaching session state model
- [ ] Question set per persona
- [ ] Sub-goal recommendation engine
- [ ] Action item generation engine
- [ ] Reality check rules
- [ ] Resume card UX
- [ ] Analytics events
- [ ] MVP beta testing

## 16) Analytics Events (Draft)

### Session Lifecycle
- coaching_session_start (persona, step=1, source)
- coaching_step_complete (step, time_spent, questions_count)
- coaching_session_complete (total_steps, total_time, actions_count)

### Corrections & Quality
- coaching_correction_suggested (rule_type, step)
- coaching_correction_accepted (rule_type, step)
- coaching_correction_rejected (rule_type, step)

### Monetization
- coaching_ad_gate_shown (reason=weekly_limit)
- coaching_ad_watched (ad_network, reward)
- coaching_upgrade_clicked (plan_type)
- coaching_limit_reached (reason=weekly_limit|slot_limit)

### Cost Tracking
- coaching_tokens_logged (input_tokens, output_tokens, model)
- coaching_cost_logged (cost_usd, model)

### Event Timing Guidelines
- coaching_session_start: when user enters Step 1 and submits first answer.
- coaching_step_complete: when all required inputs for the step are saved.
- coaching_session_complete: when Step 7 is confirmed and saved.
- coaching_correction_suggested: when a correction card is shown.
- coaching_correction_accepted: when user accepts suggested change.
- coaching_correction_rejected: when user chooses to keep original.
- coaching_ad_gate_shown: when ad gate modal is displayed.
- coaching_ad_watched: after rewarded ad completes.


## 17) Constitutional Rules for Conversational AI (The Benchmarks)

Based on the [AI Coaching Benchmarking Analysis], the AI must adhere to these "Golden Rules" to ensure a transformative experience:

### 17.1) The "Objective Provocateur" Principle
- **Mandate**: Never accept a goal at face value. Search for contradictions and "Socially Desirable" lies.
- **Trigger**: IF [Goal] is purely professional AND [Value] is personal -> THEN Challenge the user's priority.

### 17.2) System-First Architecture
- **Mandate**: Designing the "Safety Net" (Emergency Mode) is as important as the Mandalart itself.
- **Rule**: Ask "How did you fail last time?" and "What is your Emergency Mode for a bad day?" before drafting the 64 items.

### 17.3) Mathematical Logic Enforcement
- **Mandate**: Perform feasibility math on every numeric claim.
- **Example**: If Goal = $1,000/mo and Time = 5hrs/week, AI must calculate the hourly rate and check if it's realistic for a beginner.

### 17.4) Linguistic Filtering (Noun-to-Verb)
- **Mandate**: Reject nouns. Reject slogans.
- **Rule**: Every item in the 64-grid MUST start with a specific verb and include a quantitative metric (e.g., "Write 10 lines of code daily").

### 17.5) The "One by One" Interaction Rhythm
- **Mandate**: Minimize cognitive load by asking exactly one targeted question per turn.
- **Rule**: Never combine "Goal Setting" with "Situation Check" in the same turn.

---

## 18) Technical Transformation Strategy (Clean Rebuild)

To move from the "Fixed 7nd-Step" model to this "Conversational-First" model, we will perform a **"Clean Rebuild of the UI & Brain Layer"** rather than a destructive Git revert.

### Why not Git Revert?
- **Infra Preservation**: We keep the Supabase migrations, cost logging tables, and environment variable setups.
- **Knowledge Retention**: We keep the `callPerplexity` logic and error handling that took time to stabilize.
- **Service Reuse**: The backend connectivity is already solid; we just need to change the *prompt* and the *endpoint structure*.

### Migration Path:
1. **[BRAIN]**: Consolidate `supabase/functions/ai-coaching` into a single, unified `chat` endpoint that manages the State Machine.
2. **[UI]**: Create `ConversationalCoachingScreen.tsx` as a fresh start, eventually replacing the old `CoachingFlowScreen.tsx`.
3. **[STORAGE]**: Update `coachingStore.ts` to support dynamic "Slot Filling" instead of "Step-based" storage.

---
Last updated: 2025-12-27
