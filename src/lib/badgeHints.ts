/**
 * Badge Hint System
 * Provides cryptic hints for locked badges based on hint_level
 */

export const crypticHints: Record<string, string> = {
  // Special badges with cryptic hints
  weekend_warrior: "주말에도 쉬지 않는 자에게...",
  early_bird: "새벽을 여는 자에게 보상이...",
  balanced_goals: "어느 하나 소홀함이 없다면...",

  // Future badges (Phase 2)
  midnight_warrior: "하루의 경계에서...",
  perfect_week_all: "완벽함의 극치를 추구하는 자에게...",
  comeback_hero: "포기하지 않는 자에게...",
  godlife_month: "갓생을 살고 있다면...",

  // Advanced badges
  consistency_king: "꾸준함이 습관이 된다면...",
  all_goals_80: "모든 것에서 우수함을 보인다면...",
  perfect_quarter: "긴 여정을 완주하는 자에게...",
}

/**
 * Get hint text for a badge based on its key and hint_level
 */
export function getBadgeHint(key: string, hintLevel?: 'full' | 'cryptic' | 'hidden'): string {
  if (hintLevel === 'hidden') {
    return '???'
  }

  if (hintLevel === 'cryptic' && crypticHints[key]) {
    return crypticHints[key]
  }

  // For 'full' hint level, return empty string (will show full description)
  return ''
}

interface UnlockCondition {
  type: string
  days?: number
  count?: number
  threshold?: number
  [key: string]: unknown
}

/**
 * Format unlock condition for display
 * Special handling for badges with badgeKey parameter
 */
export function formatUnlockCondition(condition: UnlockCondition, hintLevel?: 'full' | 'cryptic' | 'hidden', badgeKey?: string): string {
  if (hintLevel === 'hidden') {
    return '비밀 업적'
  }

  if (hintLevel === 'cryptic') {
    return '달성 조건은 비밀입니다'
  }

  // Special cases for badges with trigger-based unlock conditions
  if (!condition.type || Object.keys(condition).length === 0) {
    // Special messages for specific badges
    switch (badgeKey) {
      case 'first_mandalart':
        return '첫 번째 만다라트 생성 (최소 16개 실천 항목 작성)'
      case 'level_10':
        return '레벨 10 달성'
      case 'monthly_champion':
        return '월간 완벽한 실천 달성'
      default:
        return '특정 이벤트 달성 시 자동 획득'
    }
  }

  // Full transparency - format the condition
  switch (condition.type) {
    case 'streak':
      return `${condition.days}일 연속 실천`
    case 'total_checks':
      return `총 ${condition.count}회 실천`
    case 'perfect_day':
      return `하루 100% 달성 ${condition.count || 1}회`
    case 'perfect_week':
      return `주간 ${condition.threshold || 80}% 이상 달성 ${condition.count}회`
    case 'perfect_month':
      return `월간 ${condition.threshold}% 이상 달성`
    case 'balanced':
      return `모든 서브골 ${condition.threshold}% 이상 달성`
    case 'time_pattern':
      if (condition.period === 'morning') {
        return `오전 체크 비율 ${condition.threshold}% 이상`
      }
      return '특정 시간대 패턴 달성'
    case 'weekend_completion':
      return '주말 완료율이 평일보다 높음'
    case 'monthly_completion':
      return `월간 ${condition.threshold}% 이상 달성`
    case 'perfect_week_in_month':
      return '한 달 내 완벽한 주(100%) 달성'
    case 'monthly_streak':
      return `한 달(${condition.days}일) 연속 실천`
    default:
      return '특정 이벤트 달성 시 자동 획득'
  }
}

/**
 * Get motivational message for badge progress
 */
export function getProgressMessage(progress: number, target: number): string {
  const percentage = (progress / target) * 100

  // Already achieved (over 100%)
  if (percentage >= 100) {
    return `목표 달성! 🎉`
  }

  if (percentage >= 80) {
    const remaining = target - progress
    return `거의 다 왔어요! ${remaining}번만 더!`
  }

  if (percentage >= 50) {
    return `절반 넘었습니다! 계속 가세요!`
  }

  if (percentage >= 25) {
    return `좋아요! ${progress}/${target} 달성 중`
  }

  return `시작이 반입니다! ${progress}/${target}`
}
