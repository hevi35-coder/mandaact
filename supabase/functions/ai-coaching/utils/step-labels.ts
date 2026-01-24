// supabase/functions/ai-coaching/utils/step-labels.ts
// Step label utilities (v20.2)

export interface StepLabel {
    main: string;
    sub: string;
}

const STEP_LABELS: Record<number, { ko: string; en: string }> = {
    1: { ko: '라이프스타일 탐구', en: 'Lifestyle Discovery' },
    2: { ko: '핵심목표 설정', en: 'Core Goal Setting' },
    3: { ko: '세부목표 1 수립', en: 'Sub-goal 1 Planning' },
    4: { ko: '세부목표 2 수립', en: 'Sub-goal 2 Planning' },
    5: { ko: '세부목표 3 수립', en: 'Sub-goal 3 Planning' },
    6: { ko: '세부목표 4 수립', en: 'Sub-goal 4 Planning' },
    7: { ko: '세부목표 5 수립', en: 'Sub-goal 5 Planning' },
    8: { ko: '세부목표 6 수립', en: 'Sub-goal 6 Planning' },
    9: { ko: '세부목표 7 수립', en: 'Sub-goal 7 Planning' },
    10: { ko: '세부목표 8 수립', en: 'Sub-goal 8 Planning' },
    11: { ko: '비상 대책 수립', en: 'Safety Net Planning' },
    12: { ko: '최종 점검', en: 'Final Review' },
};

/**
 * Get user-friendly step label
 */
export const getStepLabel = (step: number, isEn: boolean): StepLabel => {
    const label = STEP_LABELS[step] || { ko: `단계 ${step}`, en: `Step ${step}` };
    return {
        main: isEn ? label.en : label.ko,
        sub: `Step ${step}`
    };
};

/**
 * Get next step info string for sub-goal prompts
 */
export const getNextStepInfo = (subGoalNum: number, stepNum: number, isEn: boolean): string => {
    const isLastSubGoal = subGoalNum === 8;
    return isLastSubGoal
        ? (isEn ? "Safety Net Planning (Step 11)" : "비상대책 수립 (Step 11)")
        : (isEn ? `Sub-goal ${subGoalNum + 1} (Step ${stepNum + 1})` : `세부목표 ${subGoalNum + 1} (Step ${stepNum + 1})`);
};
