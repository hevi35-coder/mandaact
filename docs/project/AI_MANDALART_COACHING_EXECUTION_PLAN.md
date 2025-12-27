# AI Mandalart Coaching - Execution Plan

> Purpose: Implementation roadmap for the "Clean Rebuild" of the AI Coaching feature, moving from a rigid 7-step wizard to a conversational companion.

## 1) Core Objective
Successfully transition from the fixed `CoachingFlowScreen.tsx` (7 steps) to a `ConversationalCoachingScreen.tsx` based on the **Constitutional Rules for AI Coaching**.

## 2) Strategic Principles (The Clean Rebuild)
- **Infrastructure Preservation**: Keep current Supabase tables and cost logging.
- **Service Consolidation**: Move from multiple 파편화된 endpoints to a unified `chat` endpoint.
- **Clean UI Surface**: Build a fresh screen (`ConversationalCoachingScreen.tsx`) instead of refactoring the 1,600-line legacy file.
- **Constitutional Enforcement**: Hardcode the benchmarking rules into the system prompt.

## 3) New Execution Phases

### Phase 8 — Conversational Foundation (The "Brain" & "Ear")
**Goal**: Establish the basic chat loop and the AI's "Constitution".
- [x] **[Backend]**: Create a unified `chat` edge function that accepts a stream of messages. (v3.0 - v4.0)
- [x] **[Prompt]**: Implement the "Objective Provocateur" and "Noun-to-Verb" logic in the system prompt.
- [x] **[UI]**: Design the conversational layout (Chat Bubble + Mini-Mandalart Progress).
- [x] **[Storage]**: Update `coachingStore.ts` to support chat history and "Slot Status" (which goals are filled).

### Phase 9 — Interactive Goal Refinement (The "Provocateur")
**Goal**: Implement the logic that challenges and verifies goals.
- [x] **Logic**: Math-check engine for feasibility (Revenue/Time).
- [x] **Logic**: Linguistic filter for "Verb-First" actions.
- [x] **Interactive**: Real-time update of the Mandalart preview based on chat content.

### Phase 10 — System-First Integration (The "Safety Net")
**Goal**: Mandatory creation of the "Emergency Mode".
- [x] **Feature**: AI forces user to define "What to do when stressed/busy". (Implemented as 'Safety Net' selection from generated actions)
- [x] **Feature**: Save logic that allows "Work in Progress" states. (Zustand persist + coaching_answers table)
- [x] **Final**: The "Micro-Action Bridge" (Commitment to one 30-min task today). (Enforced via System Prompt v4.0)

## 4) Historical Progress (Legacy Flow)

### Phase 0–6 (Complete)
- **Status**: Deployed in experimental mode.
- **Outcome**: Successful infrastructure (DB, Cost Tracking) but poor UX (Survey-like feel).
- **Decision**: Pivot to Phase 8 (Clean Rebuild).

## 5) QA Criteria (New)
- [x] AI successfully rejects at least one "Noun-only" goal during testing.
- [x] Conversation remains coherent for at least 15 turns.
- [x] Mandalart grid updates correctly without manual saving.
- [x] Emergency mode is captured and saved to user preferences.

---
Last updated: 2025-12-27
