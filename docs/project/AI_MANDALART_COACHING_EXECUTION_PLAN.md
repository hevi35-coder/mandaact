# AI Mandalart Coaching - Execution Plan

> Purpose: Implementation roadmap and work log for the AI Mandalart Coaching initiative. This document breaks work into phases, defines execution order, and provides a place to record progress and notes.

## 1) Scope Reference
- Primary spec source: `docs/project/AI_MANDALART_COACHING_MILESTONE.md`
- This plan focuses on implementation order, dependencies, and tracking.

## 2) Execution Principles
- Ship in small, testable slices.
- Avoid blocking UX (no mid-session paywalls).
- Ensure type/frequency are fully configured before save.
- Keep Today screen UX stable; controls live in Plan/Edit.
 - Prefer document minimums through Phase 4, then implement sequentially.

## 2.1) Recommended Execution Order (Efficient Path)
1) Phase 4 documentation minimums (routine/save/validation UX)\n2) Phase 1 implementation (session infra)\n3) Phase 2 implementation (Steps 1–3)\n4) Phase 3 implementation (Steps 4–5)\n5) Phase 4 implementation (Steps 6–7)\n6) Phase 5 implementation (Plan/Edit + Today toggle)\n7) Phase 6 implementation (monetization gates)\n8) Phase 7 implementation (LLM ops)

## 3) Phased Roadmap (Order & Dependencies)
> Note: Checkboxes in this section are for implementation status (not documentation). Keep unchecked until code is implemented.

### Phase 0 — Foundations (Planning + Tracking)
**Goal**: Ensure tracking + data models are ready before UI work.
- [x] Define analytics events + properties in app tracking layer
- [x] Add logging for tokens/cost (stub if model not final)
- [x] Confirm existing data schema gaps (actions type/frequency fields)
- [x] Draft DB migration checklist (do not apply yet)

**Exit criteria**
- Events list finalized
- Data requirements confirmed

---

### Phase 1 — Coaching Session Infrastructure
**Goal**: Session persistence and step navigation foundation.
- [x] Create `coaching_sessions` / `coaching_answers` tables + RLS (plan only)
- [x] Define client session state model
- [x] Implement step navigation + resume logic
- [x] Implement step summaries (resume card data)

**Dependencies**
- Phase 0

**Exit criteria**
- Session start/resume works in dev
- Step state persists after app restart

---

### Phase 2 — Core Coaching Flow (Steps 1–3)
**Goal**: Persona selection and goal framing.
- [x] Step 1: Persona + situation questions
- [x] Step 2: Core goal confirmation
- [x] Step 3: Sub-goal draft
- [x] Input mapping to rules (persona/time/energy)

**Dependencies**
- Phase 1

**Exit criteria**
- Steps 1–3 complete with persistence

---

### Phase 3 — Action Generation (Steps 4–5)
**Goal**: Action drafts + reality checks.
- [x] Step 4: Action draft (base/min/challenge)
- [x] Step 5: Reality check + correction logic
- [x] Rejection flow + fallback actions

**Dependencies**
- Phase 2

**Exit criteria**
- Correction rules applied and saved

---

### Phase 4 — Routine & Save (Steps 6–7)
**Goal**: Finalize routine and save.
- [x] Step 6: Routine scheduling
- [x] Step 7: Final review + save
- [x] Pre-save validation (type/frequency configured)
- [x] Pre-save summary card

**Dependencies**
- Phase 3

**Exit criteria**
- End-to-end flow saves a Mandalart

---

### Phase 5 — Plan/Edit UX (Active/Inactive Control)
**Goal**: Control surfaces without Today clutter.
- [x] Plan modal in Mandalart detail
- [x] Active action switch UI
- [x] Minimum-today toggle in Today header (AI-coached only)

**Dependencies**
- Phase 4

**Exit criteria**
- Active/inactive actions behave correctly

---

### Phase 6 — Monetization Gates + Slot Check
**Goal**: Weekly limits, ad gate, slot deletion.
- [ ] Weekly session counter (free=1, ad=+1, max=2)
- [ ] Gate screens + copy
- [ ] Slot check gate (delete-before-start)
- [ ] Delete flow integration

**Dependencies**
- Phase 4

**Exit criteria**
- Gate logic works and never blocks mid-session

---

### Phase 7 — LLM Ops & Optimization
**Goal**: Choose model, optimize prompts, monitor cost.
- [ ] LLM comparison run + decision logged
- [ ] System prompt optimization
- [ ] Token logging + cost tracking

**Dependencies**
- Phase 2–4

**Exit criteria**
- Chosen model + baseline prompt published

---

## 4) Task Log (Per Phase)
> Record progress and notable issues here.

### Phase 0 Log
- Date: 2025-12-24
- Work done: Added AI coaching analytics event spec doc and linked in docs index; confirmed current DB gaps (actions missing type/frequency/is_active/variant); documented DB constraints in milestone; added cost logging spec doc and linked in docs index; added DB gap report doc and linked in docs index; added DB migration draft doc and linked in docs index.
- Notes: Token/cost logging hooks will emit `coaching_tokens_logged` and `coaching_cost_logged` events; instrumentation deferred to implementation phase.

### Phase 1 Log
- Date: 2025-12-24
- Work done: Added session persistence model spec doc and linked in docs index; added client session store spec doc and linked in docs index; added step navigation + resume card spec doc and linked in docs index; implemented coaching session store in mobile app; added coaching flow screen and navigation route; added Home resume card with status and step summary.
- Notes: Phase 1 infra complete; UI uses stored summary but data population still comes from future coaching flow.

### Phase 2 Log
- Date: 2025-12-25
- Work done: Implemented Step 1 persona selection + situation questions UI, Step 2 core goal confirmation UI, Step 3 sub-goal draft UI in coaching flow screen; added KO/EN copy for Step 1–3; stored rule inputs and context JSON after each step.
- Notes: Context JSON is stored in client session only; backend sync pending.

### Phase 3 Log
- Date: 2025-12-25
- Work done: Implemented Step 4 action draft UI with base/min/challenge inputs and defaults; added action expansion UI for extra actions; implemented Step 5 reality check UI with suggestion apply flow; added rejection flow and minimum fallback capture.
- Notes: Fallbacks stored in session; backend sync pending.

### Phase 4 Log
- Date: 2025-12-25
- Work done: Implemented Step 6 routine selection UI and Step 7 final review + save UI with basic validation; added routine-based action type/frequency auto-setting before save; added manual edit routing via ActionTypeSelector.
- Notes: Manual edit routes now available in Step 7 summary.

### Phase 5 Log
- Date: 2025-12-25
- Work done: Added Plan modal with active/minimum action toggles; added Today minimum mode toggle (shown when minimum selections exist) and filtering by active/minimum selections; added action_preferences table and server sync for plan selections.
- Notes: Server sync is in place; action sync to real actions still pending.

### Phase 6 Log
- Date:
- Work done:
- Notes:

### Phase 7 Log
- Date:
- Work done:
- Notes:

---
Last updated: 2025-12-25

## 5) Risks & Decisions Log

### Risks
- Date:
- Risk:
- Impact:
- Mitigation:
- Status:

### Decisions
- Date:
- Decision:
- Rationale:
- Alternatives considered:
- Owner:

## 6) Weekly Timeline (Guide)

### Week 1
- Phase 0: Foundations
- Phase 1: Session Infrastructure (start)

### Week 2
- Phase 1: Session Infrastructure (finish)
- Phase 2: Core Coaching Flow (Steps 1–3)

### Week 3
- Phase 3: Action Generation (Steps 4–5)

### Week 4
- Phase 4: Routine & Save (Steps 6–7)
- Phase 5: Plan/Edit UX (start)

### Week 5
- Phase 5: Plan/Edit UX (finish)
- Phase 6: Monetization Gates + Slot Check

### Week 6
- Phase 7: LLM Ops & Optimization
- Stabilization + QA

## 7) Phase Checklists (Detailed)

### Phase 0 Checklist
- [x] Finalize analytics events + properties
- [x] Define token/cost logging hooks
- [x] Confirm DB schema gaps and draft migrations
- [x] Draft legal/ethical disclaimer copy + placement

### Phase 1 Checklist
- [x] Create session tables + RLS (plan)
- [x] Implement client session store
- [x] Step navigation + resume card

### Phase 2 Checklist
- [x] Persona selection UI
- [x] Step 1–3 screens
- [x] Input mapping to rules
- [x] Apply KO/EN copy set (entry + steps)
- [x] Implement context JSON schema usage

### Phase 3 Checklist
- [x] Step 4 action generation UI
- [x] Step 5 correction UI
- [x] Rejection flow + fallback actions
- [x] Action expansion flow (add-action UI)

### Phase 4 Checklist
- [x] Step 6 routine UI
- [x] Step 7 pre-save review
- [x] Save validation
- [x] Pre-save summary + edit manual route

### Phase 5 Checklist
- [x] Plan modal UI
- [x] Active action switch
- [x] Today minimum toggle
- [x] Minimum toggle deep-link + visibility rules

### Phase 6 Checklist
- [ ] Weekly limits + counters
- [ ] Ad gate screens
- [ ] Slot delete flow

### Phase 7 Checklist
- [ ] LLM comparison execution
- [ ] Prompt optimization iterations
- [ ] Token/cost dashboards

## 8) QA Criteria

### Functional
- [ ] Step 1–7 flow completes without data loss
- [ ] Resume works after app restart
- [ ] Active/inactive actions behave correctly in Today
- [ ] Pre-save validation blocks unconfigured actions
- [ ] Slot delete gate works at limit

### UX
- [ ] No mid-session paywalls
- [ ] Copy is consistent (KO/EN)
- [ ] Tooltip/coach hints are dismissible

### Stability
- [ ] LLM errors fall back to template guidance
- [ ] Token/cost logging does not fail user flow

## 9) Release Checklist
- [ ] LLM model decision recorded
- [ ] Prompt optimization baseline finalized
- [ ] Analytics events verified in production
- [ ] Cost/revenue dashboard ready
- [ ] App Store metadata updated (if needed)
