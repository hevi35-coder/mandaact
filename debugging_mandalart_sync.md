# Mandalart Sync Debugging & Trials

## Issue: Action Items are not appearing in the final Mandalart grid
Despite being present in the conversation and the "Draft Preview" modal, the action items are failing to save to the database when the "Finish Mandalart" button is pressed.

## Current Hypothesis
The mapping between `actions` and `sub_goals` in the `commitMandalart` function (Supabase Edge Function) is failing. This mapping relies on string matching between the `sub_goal` field in an action object and the `title` of a sub-goal.

### Potential Root Causes:
1. **String Mismatch:** AI returns slightly different names in `updated_draft.actions[].sub_goal` compared to `updated_draft.sub_goals[]`.
2. **Translation Interference:** If the user is in English mode but the backend gets original Korean strings or vice versa, the translation wrapper `[TRANSLATE TO ENGLISH]` might be contaminating the strings.
3. **Draft Contamination:** The `currentDraft.actions` array might be getting cleared or incorrectly merged during the multi-step coaching.

## Trial 1: String Normalization and Logging
**Action:** Enhance `commitMandalart` to log the exact strings it's trying to match and make the matching even more robust (e.g., removing special characters, excessive whitespace).

## Trial 2: Reliable Mapping via Index
**Action:** If string matching fails, try to see if the AI provided an index or if we can infer it. However, the current schema doesn't have an index on actions.

## Trial 3: Client-side mapping verification
**Action:** Check if the mobile app is sending the correct structure in `handleCommit`.

---

## Trial 4: Context-Aware Action Normalization (Completed)
**Action:** In `handleChat`, forced generic `sub_goal` names (like "Sub-goal 1") to the actual sub-goal title of the current step.
**Status:** Deployed.

## Log of Attempts

### Attempt 1: Fixing `commitMandalart` string matching (Completed)
- Refine the filter logic to handle index-based matching (e.g., "Goal 1" matches position 1).
- Status: Deployed.

### Attempt 2: AI Action Attribution Fix (Completed)
- Normalized generic names during the chat session to prevent mismatches.
- Status: Deployed.

### Attempt 3: v15.0 Comprehensive Fix (Completed)
- Enhanced regex to catch variations: `SG-1`, `Goal:1`, `목표1`, ordinals (`first goal`)
- Extended normalization to all steps (not just 3-10)
- Added translation artifact cleanup (`[TRANSLATE TO ...]` removal)
- Added diagnostic logging showing matched vs unmatched actions
- Status: Deployed.
