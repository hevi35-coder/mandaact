// supabase/functions/ai-coaching/utils/sanitize.ts
// Utility functions for text sanitization (v20.2)

/**
 * Sanitize text by removing translation markers and normalizing
 */
export const sanitize = (s: string): string =>
    (s || '').replace(/\[TRANSLATE\s+TO\s+\w+\]:\s*/gi, '').trim().toLowerCase();

/**
 * Clean up AI message content - remove JSON leaks and fix formatting
 */
export const cleanMessage = (message: string): string => {
    if (!message) return '';

    return message
        // Remove JSON field leaks
        .replace(/:\s*true\b/gi, '')
        .replace(/next_step_ready\s*:/gi, '')
        .replace(/가 설정되었어요\.\s*다음 단계를 진행해 주세요!/gi, '')
        // Fix broken formatting: "word\n:" or "word\n는" patterns
        .replace(/(\S)\n+([는을를이가에서로])\s/g, '$1$2 ')
        .replace(/(\S)\n+:\s*/g, '$1: ')
        // Remove standalone dashes on their own line
        .replace(/\n\s*-\s*\n/g, '\n')
        // Reduce 3+ consecutive line breaks to max 2
        .replace(/\n{3,}/g, '\n\n')
        // Remove line break before colon
        .replace(/\n+:/g, ':')
        .trim();
};

/**
 * Clean JSON content from LLM responses - fix unescaped newlines
 */
export const cleanJson = (str: string): string => {
    try {
        return str.replace(/:\s*"([\s\S]*?)"/g, (match, p1) => {
            const escaped = p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            return `: "${escaped}"`;
        });
    } catch (e) {
        return str;
    }
};

/**
 * Jargon patterns to strip from AI messages
 */
export const JARGON_PATTERNS = [
    /이를 반영해 updated_draft에 .*/g,
    /updated_draft가 업데이트되었습니다.*/g,
    /I have updated the draft.*/g,
    /JSON 형식으로 .*/g,
    /slots_filled .*/g,
    /데이터를 동기화했습니다.*/g,
    /SMART 목표/g,
    /현재 Step \d+.*?입니다\.?/g,
    /단계에 있습니다\.?/g,
    /\[.*?\]/g,
    /center_goal/gi,
    /sub_goals?/gi,
    /updated_draft/gi,
    /slots_filled/gi,
    /next_step_ready/gi,
    /summary_data/gi
];

/**
 * Strip jargon from message
 */
export const stripJargon = (message: string): string => {
    let result = message;
    JARGON_PATTERNS.forEach(regex => {
        result = result.replace(regex, '');
    });
    return result.trim();
};
/**
 * Clean up keyword - remove hanging punctuation and broken parentheses
 */
export const cleanKeyword = (keyword: string): string => {
    if (!keyword) return '';
    return keyword
        .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]+$/, '') // Remove trailing symbols/punctuation
        .replace(/\s*[(\[{]$/, '') // Remove trailing open brackets/braces
        .replace(/\s*[(\[{][^)\]}]*$/, '') // Remove hanging open brackets that aren't closed
        .trim();
};
