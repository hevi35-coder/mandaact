// supabase/functions/ai-coaching/tests/utils.test.ts
// Unit tests for refactored utility modules

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Import modules to test
import { getStepLabel, getNextStepInfo } from "../utils/step-labels.ts";
import { sanitize, cleanMessage, cleanJson, stripJargon } from "../utils/sanitize.ts";
import { getCommonRules } from "../prompts/common.ts";
import { getStepPrompts, getSubGoalPrompt } from "../prompts/step-prompts.ts";

// ============================================
// step-labels.ts Tests
// ============================================

Deno.test("getStepLabel - returns correct Korean label for Step 1", () => {
    const label = getStepLabel(1, false);
    assertEquals(label.main, "라이프스타일 탐구");
    assertEquals(label.sub, "Step 1");
});

Deno.test("getStepLabel - returns correct English label for Step 1", () => {
    const label = getStepLabel(1, true);
    assertEquals(label.main, "Lifestyle Discovery");
    assertEquals(label.sub, "Step 1");
});

Deno.test("getStepLabel - returns correct Korean label for Step 11", () => {
    const label = getStepLabel(11, false);
    assertEquals(label.main, "비상 대책 수립");
    assertEquals(label.sub, "Step 11");
});

Deno.test("getStepLabel - returns fallback for unknown step", () => {
    const label = getStepLabel(99, false);
    assertEquals(label.main, "단계 99");
    assertEquals(label.sub, "Step 99");
});

Deno.test("getNextStepInfo - returns correct info for sub-goal 1", () => {
    const info = getNextStepInfo(1, 3, false);
    assertEquals(info, "세부목표 2 (Step 4)");
});

Deno.test("getNextStepInfo - returns Safety Net for sub-goal 8", () => {
    const info = getNextStepInfo(8, 10, false);
    assertEquals(info, "비상대책 수립 (Step 11)");
});

// ============================================
// sanitize.ts Tests
// ============================================

Deno.test("sanitize - removes translation markers", () => {
    const result = sanitize("[TRANSLATE TO ENGLISH]: 목표");
    assertEquals(result, "목표");
});

Deno.test("sanitize - handles empty string", () => {
    const result = sanitize("");
    assertEquals(result, "");
});

Deno.test("sanitize - handles null/undefined", () => {
    const result = sanitize(null as unknown as string);
    assertEquals(result, "");
});

Deno.test("cleanMessage - removes JSON field leaks", () => {
    const result = cleanMessage("Test message: true next_step_ready:");
    assertEquals(result.includes(": true"), false);
    assertEquals(result.includes("next_step_ready:"), false);
});

Deno.test("cleanMessage - reduces excessive line breaks", () => {
    const result = cleanMessage("Line1\n\n\n\nLine2");
    assertEquals(result, "Line1\n\nLine2");
});

Deno.test("cleanJson - escapes newlines in JSON strings", () => {
    const input = '{"message": "Hello\nWorld"}';
    const result = cleanJson(input);
    assertEquals(result.includes('\\n'), true);
});

Deno.test("stripJargon - removes technical jargon", () => {
    const result = stripJargon("Good message. updated_draft is ready. slots_filled now.");
    assertEquals(result.includes("updated_draft"), false);
    assertEquals(result.includes("slots_filled"), false);
});

// ============================================
// common.ts Tests
// ============================================

Deno.test("getCommonRules - returns Korean rules when isEn is false", () => {
    const stepLabel = { main: "핵심목표 설정", sub: "Step 2" };
    const rules = getCommonRules(stepLabel, false, "만다 코치");

    assertEquals(rules.includes("한국어로만 응답하세요"), true);
    assertEquals(rules.includes("ENGLISH ONLY"), false);
});

Deno.test("getCommonRules - returns English rules when isEn is true", () => {
    const stepLabel = { main: "Core Goal Setting", sub: "Step 2" };
    const rules = getCommonRules(stepLabel, true, "Life Architect AI");

    assertEquals(rules.includes("ENGLISH ONLY"), true);
    assertEquals(rules.includes("한국어"), false);
});

Deno.test("getCommonRules - includes step label in output", () => {
    const stepLabel = { main: "테스트 단계", sub: "Step 5" };
    const rules = getCommonRules(stepLabel, false, "만다 코치");

    assertEquals(rules.includes("테스트 단계 (Step 5)"), true);
});

// ============================================
// step-prompts.ts Tests
// ============================================

Deno.test("getStepPrompts - returns prompts object", () => {
    const prompts = getStepPrompts(false);

    assertExists(prompts[1]); // Step 1
    assertExists(prompts[2]); // Step 2
    assertExists(prompts[11]); // Step 11
    assertExists(prompts[12]); // Step 12
});

Deno.test("getStepPrompts - Step 1 Korean contains lifestyle keywords", () => {
    const prompts = getStepPrompts(false);

    assertEquals(prompts[1].includes("라이프스타일"), true);
    assertEquals(prompts[1].includes("summary_data"), true);
});

Deno.test("getStepPrompts - Step 2 English warns against sub-goals", () => {
    const prompts = getStepPrompts(true);

    assertEquals(prompts[2].includes("DO NOT propose sub-goals"), true);
    assertEquals(prompts[2].includes("MANDATORY QUESTION"), true);
});

Deno.test("getSubGoalPrompt - returns Korean prompt", () => {
    const prompt = getSubGoalPrompt(3, 1, "세부목표 2 (Step 4)", false);

    assertEquals(prompt.includes("세부목표 1"), true);
    assertEquals(prompt.includes("사용자 우선 접근"), true);
});

Deno.test("getSubGoalPrompt - returns English prompt", () => {
    const prompt = getSubGoalPrompt(5, 3, "Sub-goal 4 (Step 6)", true);

    assertEquals(prompt.includes("Sub-goal 3"), true);
    assertEquals(prompt.includes("USER-FIRST APPROACH"), true);
});

console.log("✅ All unit tests defined. Run with: deno test");
