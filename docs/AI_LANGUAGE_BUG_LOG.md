# AI Language Enforcement Bug Log

## Issue Overview
Despite multiple attempts to enforce English mode in the AI coaching system, the AI (Perplexity Sonar model) occasionally reverts to Korean when the conversation history contains Korean turns or when the initial user context is mixed.

## Root Cause Analysis
- **Linguistic Inertia**: LLMs tend to follow the language pattern of the immediate "Context" (Conversation History) even if "System rules" say otherwise.
- **Context Injection**: When the `[MANDALART DRAFT]` or `[SUMMARY]` contains Korean text (cached from previous sessions), the AI interprets this as proof that Korean is the active language.
- **Model Bias**: Sonar models might have a prioritization logic where "History" is weighted heavily for conversational consistency.

## Attempted Solutions & Results

### Attempt 1: Simple System Reinforcement
- **Method**: Added "Talk in English" to the system prompt.
- **Result**: Failed. Ignored by the AI after 1-2 turns.

### Attempt 2: Explicit Metadata Parameter
- **Method**: Passing `language: i18n.language` from the client and using `isEn` flag in the Edge Function.
- **Result**: Mixed. AI sometimes respects it, but often breaks when user speaks Korean.

### Attempt 3: Aggressive Header & Footer Prompts (v12.0)
- **Method**: Added `### FORCED LANGUAGE MODE: [ENGLISH]` at the very top and `### FINAL INSTRUCTION` at the absolute bottom of the payload.
- **Result**: Reported failure by user.

### Attempt 5: Multi-turn Native History (Current)
- **Method**: Refactored `callPerplexity` to send history as an array of messages instead of a single string block. Added explicit translation instructions for Korean context.
- **Result**: Ongoing testing (User reports persistent issues).

### Attempt 6: "Context Translation Bias" - Explicit Translation Examples & Prefixing
- **Method**: Added few-shot examples and programmatically prefixed Korean metadata with `[TRANSLATE TO ENGLISH]`.
- **Result**: FAILED (Reported on 2026-01-04). AI still responds in Korean when history contains Korean.

### Attempt 7: "Total System Dominance" - Double System Messages & Negative Constraint
- **Method**: Sandwich Method (System msg at top and bottom) + Negative Constraint ban on Korean chars.
- **Result**: FAILED (Reported on 2026-01-04). AI still prioritized Korean history over system rules. Even ignored "Routine First" instruction.

### Attempt 8: "Identity Erasure & History Sanitization"
- **Method**: Persona Shift (Goal Arch AI) + Language Tagging in history.
- **Result**: FAILED (Reported on 2026-01-04). The "Manda Coach" intro was actually coming from localized static JSON, and the AI was bypassing the "Routine First" rule by hallucinating that the intro fulfilled part of the lifestyle step.

### Attempt 9: "Synchronized Locale & Mandatory State Guard"
- **Method**: Updated static JSON greetings and implemented state-based checklists in Step 1.
- **Result**: FAILED (Reported on 2026-01-04). While the initial greeting was English, the AI's response to the user's English input flipped back to Korean. Also caused a double-greeting UI bug.

### Attempt 10: "Deterministic Language Locking & Session Metadata Guard"
- **Method**: Saved `isEn` to metadata on Turn 1 to force language choice.
- **Result**: FAILED (Reported on 2026-01-04). The AI still responded in Korean for a user who previously had a Korean session. The lock was likely "too sticky" or detected the wrong language initially.

### Attempt 11: "Dynamic Language Reset & Post-Process Filter"
- **Method**: 
  1. **Dynamic Overwrite**: If the mobile app sends a language param that contradicts the "locked" metadata, automatically **unlock and update** the metadata to the new preference.
  2. **Post-Process Scan**: After the AI generates a response, the script now scans the text for Hangul. If found in English mode, it flags the response as a `[SYSTEM NOTE: Translation Failure]` so the user knows it's a bug, and logs a critical error.
  3. **Initialization Guard**: Replaced the fragile client-side init with a `hasAttemptedInit` Ref to strictly prevent double greetings.
### Attempt 13: "Final Language Sovereignty & Reflection Turn"
- **Method**: Implemented a "Reflection Turn" to re-translate Korean to English and hardened the session lock to ignore device locale.
- **Result**: FAILED (Reported on 2026-01-04). The AI still flipped to Korean after a short English input ("Normal life") and unexpectedly skipped Step 1 altogether.

### Attempt 15: "Nuclear Language Fix" (2026-01-04) ✅ SUCCESS
- **Method**: 
  1. **Complete Korean Removal**: Removed ALL Korean keywords from EN system prompt (including "Mandalart", "만다 코치").
  2. **Persona Rename**: Changed English persona to "Life Architect AI".
  3. **Aggressive History Rewrite**: Messages with Korean replaced with generic placeholders.
  4. **Message Alternation Fix**: Ensured user/assistant messages alternate properly.
  5. **Retry Loop**: If Korean detected in response, retry up to 2 times with translation fallback.
- **Result**: **SUCCESS** (2026-01-04 02:07 KST)

## Root Cause Analysis (Final)

### Why Previous Attempts Failed:
1. **"Mandalart" Semantic Trigger**: The model strongly associated the concept of "만다라트" with Korean, causing it to default to Korean regardless of explicit language instructions.
2. **Korean in System Prompt**: Even in "English mode", previous prompts contained Korean characters and terms ("핵심 목표", "존댓말").
3. **History Leakage**: Korean messages in conversation history biased the model toward Korean output.
4. **Priming Turn Issues**: Adding fake priming turns violated Perplexity's message alternation rules.

### Why Attempt 15 Succeeded:
1. **Zero Korean Exposure**: The EN system prompt contains absolutely no Korean characters or Korean-associated keywords.
2. **Neutral Persona**: "Life Architect AI" has no Korean semantic association, unlike "Manda Coach".
3. **Aggressive Sanitization**: Korean content in history is completely replaced with neutral placeholders.
4. **Proper API Compliance**: Message alternation is enforced, and unsupported API parameters were removed.

---
*Last Updated: 2026-01-04 02:08 KST*
