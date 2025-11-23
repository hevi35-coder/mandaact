// Re-exported types for convenience (used at end of file)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Transition, Variant } from 'framer-motion'

// ============================================
// 애니메이션 타입 정의
// ============================================

/**
 * 🎯 HERO/PROFILE - 무게감, 차분함
 *
 * 사용 대상: UserProfileCard, StreakHero
 * 특징: 0.5s 느린 진입, 사용자 정체성/주요 지표 강조
 * 의도: 중요도 강조, 신뢰감, 무게감
 */
export const HERO_ANIMATION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.5,
    ease: [0.16, 1, 0.3, 1] // easeOutExpo
  }
} as const

/**
 * 📋 CARD - 빠르고 경쾌함
 *
 * 사용 대상: AIInsightCard, GoalPrediction, LiveInsights
 * 특징: 0.3s 빠른 진입
 * 의도: 경쾌하고 반응성 좋은 UI
 */
export const CARD_ANIMATION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.3,
    ease: 'easeOut'
  }
} as const

/**
 * 📝 LIST_ITEM - 순차적 등장
 *
 * 사용 대상: QuestLog, LiveInsights 항목
 * 특징: 미세한 스케일 변화 + stagger
 * 의도: 리스트 항목의 자연스러운 등장
 */
export const LIST_ITEM_ANIMATION = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    duration: 0.3,
    ease: 'easeOut'
  }
} as const

/**
 * 🏆 BADGE - 활발한 스프링
 *
 * 사용 대상: 배지, 성취, 보상 요소
 * 특징: Spring 애니메이션 (튕기는 느낌)
 * 의도: 즐거움, 축하 감정
 */
export const BADGE_ANIMATION = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 15
  }
} as const

/**
 * ⭐ BADGE_NEW - 더 강한 스프링 (NEW 인디케이터)
 *
 * 사용 대상: 새로 획득한 배지 인디케이터
 * 특징: 더 빠른 spring + 회전
 * 의도: 강한 어텐션, 축하
 */
export const BADGE_NEW_ANIMATION = {
  initial: { scale: 0, rotate: -12 },
  animate: { scale: 1, rotate: 0 },
  transition: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 10
  }
} as const

/**
 * 👆 HOVER_SCALE - 호버 상태 (스케일)
 *
 * 사용 대상: 인터랙티브 카드
 * 특징: 미세한 스케일 변화
 * 의도: 클릭 가능함을 암시
 */
export const HOVER_SCALE = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.2 }
} as const

/**
 * 👆 HOVER_LIFT - 호버 상태 (리프트)
 *
 * 사용 대상: 카드
 * 특징: Y축 이동 + 그림자
 * 의도: 떠오르는 느낌
 */
export const HOVER_LIFT = {
  whileHover: { y: -4, scale: 1.01 },
  transition: { duration: 0.2 }
} as const

/**
 * ✓ CHECKBOX - 체크박스 애니메이션
 *
 * 사용 대상: 체크박스
 * 특징: 스프링 + 스케일
 */
export const CHECKBOX_ANIMATION = {
  whileTap: { scale: 0.9 },
  transition: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 15
  }
} as const

// ============================================
// EXIT 애니메이션
// ============================================

/**
 * 💨 FADE_OUT - 페이드 아웃
 */
export const FADE_OUT = {
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
} as const

/**
 * ⬆️ SLIDE_OUT_UP - 위로 슬라이드 아웃
 */
export const SLIDE_OUT_UP = {
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
} as const

/**
 * ⬇️ SLIDE_OUT_DOWN - 아래로 슬라이드 아웃
 */
export const SLIDE_OUT_DOWN = {
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3 }
} as const

// ============================================
// Stagger 헬퍼
// ============================================

/**
 * Stagger 지연 계산
 * @param index - 항목 인덱스
 * @param baseDelay - 기본 지연 시간 (기본값: 0.05초)
 */
export function getStaggerDelay(index: number, baseDelay: number = 0.05): number {
  return index * baseDelay
}

/**
 * 중첩 Stagger 지연 계산
 * @param groupIndex - 그룹 인덱스
 * @param itemIndex - 항목 인덱스
 * @param groupDelay - 그룹 간 지연 (기본값: 0.1초)
 * @param itemDelay - 항목 간 지연 (기본값: 0.05초)
 */
export function getNestedStaggerDelay(
  groupIndex: number,
  itemIndex: number,
  groupDelay: number = 0.1,
  itemDelay: number = 0.05
): number {
  return groupIndex * groupDelay + itemIndex * itemDelay
}

/**
 * 애니메이션 병합 헬퍼
 * @param base - 기본 애니메이션
 * @param override - 오버라이드할 속성
 */
export function mergeAnimation<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>
): T {
  return {
    ...base,
    ...override,
    transition: {
      ...(base.transition || {}),
      ...(override.transition || {})
    }
  }
}

// ============================================
// Stagger 상수
// ============================================

export const STAGGER = {
  FAST: 0.03,      // 히트맵 셀 등
  NORMAL: 0.05,    // 일반 리스트 항목
  SLOW: 0.1,       // 그룹, 카드
} as const

// ============================================
// PAGE TRANSITIONS
// ============================================

/**
 * 📄 PAGE_FADE - 페이지 전환 (Fade)
 *
 * 사용 대상: 페이지 간 전환
 * 특징: 부드러운 페이드 효과
 */
export const PAGE_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
} as const

/**
 * 📄 PAGE_SLIDE - 페이지 전환 (Slide)
 *
 * 사용 대상: 페이지 간 전환
 * 특징: 우측에서 슬라이드 인
 */
export const PAGE_SLIDE = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: {
    duration: 0.3,
    ease: [0.16, 1, 0.3, 1] // easeOutExpo
  }
} as const

// ============================================
// Re-export for convenience
// ============================================

export type { Variant, Transition } from 'framer-motion'
