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
 * Uses rule-based pattern matching
 */
export function suggestActionType(title: string): AISuggestion {
  const lower = title.toLowerCase()

  // Pattern 1: Routine with explicit frequency
  if (/매일|하루|daily/.test(lower)) {
    return {
      type: 'routine',
      confidence: 'high',
      reason: '매일 반복하는 실천으로 보여요',
      routineFrequency: 'daily'
    }
  }

  if (/매주|주\s*\d+회|주간/.test(lower)) {
    return {
      type: 'routine',
      confidence: 'high',
      reason: '매주 반복하는 실천으로 보여요',
      routineFrequency: 'weekly'
    }
  }

  if (/매월|월\s*\d+회|월간/.test(lower)) {
    // Check if it's a goal (매월 달성)
    if (/달성|목표/.test(lower)) {
      return {
        type: 'mission',
        confidence: 'high',
        reason: '매월 반복되는 목표로 보여요',
        missionCompletionType: 'periodic',
        missionPeriodCycle: 'monthly'
      }
    }
    return {
      type: 'routine',
      confidence: 'medium',
      reason: '매월 반복하는 실천으로 보여요',
      routineFrequency: 'monthly'
    }
  }

  // Pattern 2: Mission with completion keyword
  if (/달성|취득|완료|마치기|끝내기|획득|통과/.test(lower)) {
    // Check if it's periodic
    if (/분기|quarter/.test(lower)) {
      return {
        type: 'mission',
        confidence: 'high',
        reason: '분기별 반복 목표로 보여요',
        missionCompletionType: 'periodic',
        missionPeriodCycle: 'quarterly'
      }
    }
    if (/매년|연간|년\s*\d+회/.test(lower)) {
      return {
        type: 'mission',
        confidence: 'medium',
        reason: '연간 반복 목표로 보여요',
        missionCompletionType: 'periodic',
        missionPeriodCycle: 'yearly'
      }
    }
    return {
      type: 'mission',
      confidence: 'medium',
      reason: '완료 목표가 있는 것 같아요',
      missionCompletionType: 'once'
    }
  }

  // Pattern 3: Reference/mindset
  if (/마음|태도|정신|자세|생각|마인드|가치|철학/.test(lower)) {
    return {
      type: 'reference',
      confidence: 'high',
      reason: '마음가짐 관련 항목으로 보여요'
    }
  }

  // Pattern 4: Common action verbs - likely routine
  if (/읽기|공부|운동|명상|기도|쓰기|보기|듣기|하기/.test(lower)) {
    return {
      type: 'routine',
      confidence: 'medium',
      reason: '반복적으로 하는 실천으로 보여요',
      routineFrequency: 'daily'
    }
  }

  // Pattern 5: Score/number-based goals - likely mission
  if (/\d+점|\d+개|\d+명|\d+만원|\d+%/.test(lower)) {
    return {
      type: 'mission',
      confidence: 'medium',
      reason: '수치 목표가 있는 것 같아요',
      missionCompletionType: 'once'
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
