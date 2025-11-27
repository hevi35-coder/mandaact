/**
 * XP Information Constants
 * Shared between web and mobile apps for consistent display
 */

// XP 획득 방법
export const XP_EARNING_RULES = [
  { label: '실천 1회', xp: '+10 XP' },
  { label: '스트릭 (7일+)', xp: '+5 XP', extra: '추가' },
  { label: '완벽한 하루 (100%)', xp: '+50 XP' },
  { label: '완벽한 주 (80%+)', xp: '+200 XP' },
  { label: '배지 획득', xp: '배지별 상이' },
] as const

// XP 배율 보너스
export const XP_MULTIPLIER_BONUSES = [
  { label: '주말 (토·일)', multiplier: '1.5배', color: 'blue', duration: null },
  { label: '복귀 환영 (3일 부재 후)', multiplier: '1.5배', color: 'green', duration: '3일간' },
  { label: '레벨 달성 축하 (5, 10, 15...)', multiplier: '2배', color: 'yellow', duration: '7일간' },
  { label: '완벽한 주 달성 후', multiplier: '2배', color: 'purple', duration: '7일간' },
] as const

// 배율 합산 예시
export const XP_MULTIPLIER_EXAMPLE = '(예: 1.5배 + 2배 = 3.5배)'

// 공정한 XP 정책
export const FAIR_XP_POLICIES = [
  '각 실천은 하루 3회까지 체크/해제 가능',
  '동일 실천은 10초 후 재체크 가능',
  '짧은 시간 내 과도한 체크 시 제한',
] as const

// 공정한 배지 정책
export const FAIR_BADGE_POLICIES = [
  '최소 16개 실천 항목 (5자 이상)',
  '정상적인 체크 패턴 (자동화 감지)',
  '빈 만다라트 생성 불가',
] as const

// XP 정보 타입
export interface XPEarningRule {
  label: string
  xp: string
  extra?: string
}

export interface XPMultiplierBonus {
  label: string
  multiplier: string
  color: 'blue' | 'green' | 'yellow' | 'purple'
  duration: string | null
}

// 색상 매핑 (Tailwind CSS 클래스)
export const XP_MULTIPLIER_COLORS = {
  blue: {
    web: 'text-blue-500',
    mobile: '#3b82f6',
  },
  green: {
    web: 'text-green-500',
    mobile: '#22c55e',
  },
  yellow: {
    web: 'text-yellow-500',
    mobile: '#eab308',
  },
  purple: {
    web: 'text-purple-500',
    mobile: '#a855f7',
  },
} as const
