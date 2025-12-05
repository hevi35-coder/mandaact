/**
 * PostHog Analytics Integration
 *
 * 사용자 행동 분석 및 이벤트 추적을 위한 PostHog 설정
 */

import posthog from 'posthog-js'
import {
  POSTHOG_EVENTS,
  buildMandalartCreatedProps,
  buildActionCheckedProps,
  buildBadgeUnlockedProps,
  buildTutorialCompletedProps,
  buildNotificationClickedProps,
  buildLevelUpProps,
  buildWeeklyReportGeneratedProps,
  buildGoalDiagnosisViewedProps,
  buildLoginProps,
  type MandalartCreatedData,
  type ActionCheckedData,
  type BadgeUnlockedData,
  type TutorialCompletedData,
  type NotificationClickedData,
  type LevelUpData,
  type WeeklyReportGeneratedData,
  type GoalDiagnosisViewedData,
} from '@mandaact/shared'

// PostHog 초기화 여부
let isInitialized = false

/**
 * PostHog 초기화
 *
 * 환경변수에서 API 키와 호스트를 가져와 PostHog를 초기화합니다.
 */
export const initPostHog = () => {
  const apiKey = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'

  // API 키가 없으면 초기화하지 않음 (개발 환경 등)
  if (!apiKey) {
    console.warn('PostHog API key not found. Analytics will be disabled.')
    return
  }

  if (isInitialized) {
    console.warn('PostHog is already initialized')
    return
  }

  posthog.init(apiKey, {
    api_host: host,
    // 자동 이벤트 캡처 설정
    autocapture: false, // 수동으로 필요한 이벤트만 추적
    capture_pageview: true, // 페이지뷰 자동 추적
    capture_pageleave: true, // 페이지 이탈 추적

    // 개인정보 보호 설정
    opt_out_capturing_by_default: false,
    respect_dnt: true, // Do Not Track 헤더 존중

    // 세션 녹화 (선택사항 - 프라이버시 고려하여 비활성화)
    disable_session_recording: true,

    // 성능 설정
    loaded: () => {
      console.log('PostHog loaded successfully')
      isInitialized = true
    }
  })
}

/**
 * 사용자 식별
 *
 * @param userId - 사용자 고유 ID (Supabase user ID)
 * @param properties - 추가 사용자 속성
 */
export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  if (typeof posthog?.identify !== 'function') return

  posthog.identify(userId, properties)
}

/**
 * 사용자 로그아웃 시 호출
 */
export const resetUser = () => {
  if (typeof posthog?.reset !== 'function') return

  posthog.reset()
}

/**
 * 커스텀 이벤트 추적 (내부 헬퍼)
 *
 * @param eventName - 이벤트 이름
 * @param properties - 이벤트 속성
 */
function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  // PostHog 객체가 로드되었는지 직접 확인
  if (typeof posthog?.capture !== 'function') {
    console.warn('PostHog not ready, event not captured:', eventName)
    return
  }

  posthog.capture(eventName, properties)
}

// ========================================
// 핵심 이벤트 추적 함수들 (shared 사용)
// ========================================

// 1. 만다라트 생성
export const trackMandalartCreated = (data: MandalartCreatedData) => {
  trackEvent(
    POSTHOG_EVENTS.MANDALART_CREATED,
    buildMandalartCreatedProps(data, 'web')
  )
}

// 2. 액션 체크
export const trackActionChecked = (data: ActionCheckedData) => {
  trackEvent(
    POSTHOG_EVENTS.ACTION_CHECKED,
    buildActionCheckedProps(data, 'web')
  )
}

// 3. 배지 획득
export const trackBadgeUnlocked = (data: BadgeUnlockedData) => {
  trackEvent(
    POSTHOG_EVENTS.BADGE_UNLOCKED,
    buildBadgeUnlockedProps(data, 'web')
  )
}

// 4. 튜토리얼 완료
export const trackTutorialCompleted = (data: TutorialCompletedData) => {
  trackEvent(
    POSTHOG_EVENTS.TUTORIAL_COMPLETED,
    buildTutorialCompletedProps(data, 'web')
  )
}

// 5. 알림 클릭
export const trackNotificationClicked = (data: NotificationClickedData) => {
  trackEvent(
    POSTHOG_EVENTS.NOTIFICATION_CLICKED,
    buildNotificationClickedProps(data, 'web')
  )
}

// ========================================
// 추가 이벤트
// ========================================

// 주간 리포트 생성
export const trackWeeklyReportGenerated = (data: WeeklyReportGeneratedData) => {
  trackEvent(
    POSTHOG_EVENTS.WEEKLY_REPORT_GENERATED,
    buildWeeklyReportGeneratedProps(data, 'web')
  )
}

// 목표 진단 조회
export const trackGoalDiagnosisViewed = (data: GoalDiagnosisViewedData) => {
  trackEvent(
    POSTHOG_EVENTS.GOAL_DIAGNOSIS_VIEWED,
    buildGoalDiagnosisViewedProps(data, 'web')
  )
}

// 레벨 업
export const trackLevelUp = (data: LevelUpData) => {
  trackEvent(
    POSTHOG_EVENTS.LEVEL_UP,
    buildLevelUpProps(data, 'web')
  )
}

// 로그인
export const trackLogin = (method: 'email' | 'google' | 'apple') => {
  trackEvent(
    POSTHOG_EVENTS.USER_LOGGED_IN,
    buildLoginProps({ method }, 'web')
  )
}

// 회원가입
export const trackSignup = (method: 'email' | 'google' | 'apple') => {
  trackEvent(
    POSTHOG_EVENTS.USER_SIGNED_UP,
    buildLoginProps({ method }, 'web')
  )
}

// 페이지 뷰 (자동 추적되지만 커스텀 속성 추가 가능)
export const trackPageView = (pageName: string, properties?: Record<string, unknown>) => {
  trackEvent(POSTHOG_EVENTS.PAGEVIEW, {
    page_name: pageName,
    ...properties
  })
}

export default posthog
