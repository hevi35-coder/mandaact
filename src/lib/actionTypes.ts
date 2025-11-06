// Action type utility functions and AI suggestion logic

export type ActionType = 'routine' | 'mission' | 'reference'
export type RoutineFrequency = 'daily' | 'weekly' | 'monthly'
export type MissionCompletionType = 'once' | 'periodic'
export type MissionPeriodCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type Confidence = 'high' | 'medium' | 'low'

export interface AISuggestion {
  type: ActionType
  confidence: Confidence
  reason: string
  routineFrequency?: RoutineFrequency
  missionCompletionType?: MissionCompletionType
  missionPeriodCycle?: MissionPeriodCycle
}

export interface ActionTypeLabels {
  main: string
  description: string
  icon: string
}

/**
 * Get display labels for action types
 */
export function getActionTypeLabel(type: ActionType, showDescription: boolean = false): string {
  const labels: Record<ActionType, ActionTypeLabels> = {
    routine: {
      main: '루틴',
      description: '반복실천',
      icon: '🔄'
    },
    mission: {
      main: '미션',
      description: '완료목표',
      icon: '🎯'
    },
    reference: {
      main: '참고',
      description: '마음가짐',
      icon: '💡'
    }
  }

  const label = labels[type]
  if (showDescription) {
    return `${label.main}(${label.description})`
  }
  return label.main
}

/**
 * AI-powered action type suggestion based on title
 * Uses rule-based pattern matching with priority-based logic
 */
export function suggestActionType(title: string): AISuggestion {
  const lower = title.toLowerCase()

  // Detect patterns first (for complex logic)
  const hasCompletionKeyword = /달성|취득|완료|마치기|끝내기|획득|통과|성공|성취|감량|증가|향상|개선|증진/.test(lower)
  const hasGoalKeyword = /목표|도전|성공/.test(lower)
  const hasNumberGoal = /\d+\s*(점|개|명|만원|원|%|권|시간|분|km|kg|번|회|페이지|챕터|강|일)/.test(lower)
  const hasReferenceKeyword = /마음|태도|정신|자세|생각|마인드|가치|철학|원칙|명언|다짐|신념|기준|명심/.test(lower)
  const hasRoutineVerb = /읽기|공부|운동|명상|기도|쓰기|보기|듣기|하기|걷기|달리기|먹기|마시기|일어나기|자기|정리|청소|체크|확인|검토|복습|예습/.test(lower)

  // Check if it's a time-based routine (e.g., "30분 운동", "1시간 공부")
  const isTimePlusVerb = /\d+\s*(시간|분)\s*(운동|공부|읽기|쓰기|명상|걷기|달리기)/.test(lower)

  const hasDailyKeyword = /매일|하루|daily|날마다|일일/.test(lower)
  const hasWeeklyKeyword = /매주|주\s*\d+회|주간|weekly/.test(lower)
  const hasMonthlyKeyword = /매월|월\s*\d+회|월간|monthly/.test(lower)
  const hasQuarterlyKeyword = /분기|quarter/.test(lower)
  const hasYearlyKeyword = /매년|연간|년\s*\d+회|yearly/.test(lower)

  // Priority 1: Reference/mindset (highest specificity)
  if (hasReferenceKeyword) {
    return {
      type: 'reference',
      confidence: 'high',
      reason: '마음가짐이나 원칙 관련 항목으로 보여요'
    }
  }

  // Priority 2: Periodic missions with explicit cycle
  if (hasQuarterlyKeyword && (hasCompletionKeyword || hasGoalKeyword || hasNumberGoal)) {
    return {
      type: 'mission',
      confidence: 'high',
      reason: '분기별 반복 목표로 보여요',
      missionCompletionType: 'periodic',
      missionPeriodCycle: 'quarterly'
    }
  }

  if (hasYearlyKeyword && (hasCompletionKeyword || hasGoalKeyword || hasNumberGoal)) {
    return {
      type: 'mission',
      confidence: 'high',
      reason: '연간 반복 목표로 보여요',
      missionCompletionType: 'periodic',
      missionPeriodCycle: 'yearly'
    }
  }

  if (hasMonthlyKeyword && (hasCompletionKeyword || hasGoalKeyword || hasNumberGoal)) {
    return {
      type: 'mission',
      confidence: 'high',
      reason: '매월 반복되는 목표로 보여요',
      missionCompletionType: 'periodic',
      missionPeriodCycle: 'monthly'
    }
  }

  if (hasWeeklyKeyword && (hasCompletionKeyword || hasGoalKeyword || hasNumberGoal)) {
    return {
      type: 'mission',
      confidence: 'high',
      reason: '매주 반복되는 목표로 보여요',
      missionCompletionType: 'periodic',
      missionPeriodCycle: 'weekly'
    }
  }

  // Priority 3: One-time missions with strong indicators
  if (hasCompletionKeyword && hasNumberGoal) {
    return {
      type: 'mission',
      confidence: 'high',
      reason: '완료해야 할 수치 목표가 있어요',
      missionCompletionType: 'once'
    }
  }

  if (hasCompletionKeyword || hasGoalKeyword) {
    return {
      type: 'mission',
      confidence: 'medium',
      reason: '완료 목표가 있는 것 같아요',
      missionCompletionType: 'once'
    }
  }

  // Priority 4: Number-based goals without frequency (likely one-time mission)
  // BUT: Time + verb combinations are routines (e.g., "30분 운동")
  if (hasNumberGoal && !hasDailyKeyword && !hasWeeklyKeyword && !hasMonthlyKeyword) {
    if (isTimePlusVerb) {
      return {
        type: 'routine',
        confidence: 'medium',
        reason: '시간 기반 반복 실천으로 보여요',
        routineFrequency: 'daily'
      }
    }
    return {
      type: 'mission',
      confidence: 'medium',
      reason: '수치 목표가 있는 것 같아요',
      missionCompletionType: 'once'
    }
  }

  // Priority 5: Routines with explicit frequency
  if (hasDailyKeyword) {
    return {
      type: 'routine',
      confidence: 'high',
      reason: '매일 반복하는 실천으로 보여요',
      routineFrequency: 'daily'
    }
  }

  if (hasWeeklyKeyword) {
    return {
      type: 'routine',
      confidence: 'high',
      reason: '매주 반복하는 실천으로 보여요',
      routineFrequency: 'weekly'
    }
  }

  if (hasMonthlyKeyword) {
    return {
      type: 'routine',
      confidence: 'medium',
      reason: '매월 반복하는 실천으로 보여요',
      routineFrequency: 'monthly'
    }
  }

  // Priority 6: Common action verbs (likely routine)
  if (hasRoutineVerb) {
    return {
      type: 'routine',
      confidence: 'medium',
      reason: '반복적으로 하는 실천으로 보여요',
      routineFrequency: 'daily'
    }
  }

  // Default: routine with low confidence
  return {
    type: 'routine',
    confidence: 'low',
    reason: '루틴으로 추정됩니다',
    routineFrequency: 'daily'
  }
}

/**
 * Calculate next period for periodic missions
 */
export function calculateNextPeriod(
  currentEnd: Date,
  cycle: MissionPeriodCycle
): { start: Date; end: Date } {
  const start = new Date(currentEnd)
  start.setDate(start.getDate() + 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)

  switch (cycle) {
    case 'daily':
      end.setDate(end.getDate() + 1)
      break
    case 'weekly':
      end.setDate(end.getDate() + 7)
      break
    case 'monthly':
      end.setMonth(end.getMonth() + 1)
      break
    case 'quarterly':
      end.setMonth(end.getMonth() + 3)
      break
    case 'yearly':
      end.setFullYear(end.getFullYear() + 1)
      break
  }

  end.setDate(end.getDate() - 1)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Get initial period for a new periodic mission
 */
export function getInitialPeriod(cycle: MissionPeriodCycle): { start: Date; end: Date } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)

  switch (cycle) {
    case 'daily':
      end.setHours(23, 59, 59, 999)
      break
    case 'weekly': {
      // End of this week (Saturday)
      const dayOfWeek = start.getDay()
      end.setDate(end.getDate() + (6 - dayOfWeek))
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'monthly':
      // End of this month
      end.setMonth(end.getMonth() + 1)
      end.setDate(0) // Last day of current month
      end.setHours(23, 59, 59, 999)
      break
    case 'quarterly': {
      // End of this quarter
      const currentQuarter = Math.floor(start.getMonth() / 3)
      end.setMonth((currentQuarter + 1) * 3)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'yearly':
      // End of this year
      end.setMonth(11)
      end.setDate(31)
      end.setHours(23, 59, 59, 999)
      break
  }

  return { start, end }
}

/**
 * Check if action should be shown today based on type and settings
 */
export function shouldShowToday(action: {
  type: ActionType
  routine_frequency?: RoutineFrequency
  routine_weekdays?: number[]
  mission_completion_type?: MissionCompletionType
  mission_current_period_end?: string
  mission_status?: string
}): boolean {
  const today = new Date()
  const dayOfWeek = today.getDay()

  switch (action.type) {
    case 'routine':
      if (action.routine_frequency === 'daily') return true
      if (action.routine_frequency === 'weekly') {
        if (action.routine_weekdays && action.routine_weekdays.length > 0) {
          return action.routine_weekdays.includes(dayOfWeek)
        }
        return true // Show every day for weekly count-based routines
      }
      if (action.routine_frequency === 'monthly') return true
      return true

    case 'mission':
      // Hide completed one-time missions
      if (action.mission_completion_type === 'once' && action.mission_status === 'completed') {
        return false
      }

      // Check if within period for periodic missions
      if (
        action.mission_completion_type === 'periodic' &&
        action.mission_current_period_end
      ) {
        const periodEnd = new Date(action.mission_current_period_end)
        return today <= periodEnd
      }

      return true

    case 'reference':
      return true // Show in list (but checkbox disabled and excluded from progress)

    default:
      return true
  }
}

/**
 * Get period cycle display label
 */
export function getPeriodCycleLabel(cycle: MissionPeriodCycle): string {
  const labels: Record<MissionPeriodCycle, string> = {
    daily: '매일',
    weekly: '매주',
    monthly: '매월',
    quarterly: '분기별',
    yearly: '매년'
  }
  return labels[cycle]
}

/**
 * Get routine frequency display label
 */
export function getRoutineFrequencyLabel(frequency: RoutineFrequency): string {
  const labels: Record<RoutineFrequency, string> = {
    daily: '매일',
    weekly: '매주',
    monthly: '매월'
  }
  return labels[frequency]
}

/**
 * Get weekday names in Korean
 */
export function getWeekdayNames(): Array<{ value: number; label: string; short: string }> {
  return [
    { value: 0, label: '일요일', short: '일' },
    { value: 1, label: '월요일', short: '월' },
    { value: 2, label: '화요일', short: '화' },
    { value: 3, label: '수요일', short: '수' },
    { value: 4, label: '목요일', short: '목' },
    { value: 5, label: '금요일', short: '금' },
    { value: 6, label: '토요일', short: '토' }
  ]
}
