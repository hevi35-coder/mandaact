/**
 * PostHog Analytics Integration
 *
 * 사용자 행동 분석 및 이벤트 추적을 위한 PostHog 설정
 */

import posthog from 'posthog-js'

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
  if (!isInitialized) return

  posthog.identify(userId, properties)
}

/**
 * 사용자 로그아웃 시 호출
 */
export const resetUser = () => {
  if (!isInitialized) return

  posthog.reset()
}

/**
 * 커스텀 이벤트 추적
 *
 * @param eventName - 이벤트 이름
 * @param properties - 이벤트 속성
 */
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (!isInitialized) return

  posthog.capture(eventName, properties)
}

// ========================================
// 핵심 이벤트 추적 함수들
// ========================================

/**
 * Phase 8.1 - 핵심 이벤트 5개
 */

// 1. 만다라트 생성
export const trackMandalartCreated = (data: {
  mandalart_id: string
  input_method: 'image' | 'text' | 'manual'
  sub_goals_count: number
  actions_count: number
}) => {
  trackEvent('mandalart_created', {
    mandalart_id: data.mandalart_id,
    input_method: data.input_method,
    sub_goals_count: data.sub_goals_count,
    actions_count: data.actions_count,
    timestamp: new Date().toISOString()
  })
}

// 2. 액션 체크
export const trackActionChecked = (data: {
  action_id: string
  action_type: 'routine' | 'mission' | 'reference'
  sub_goal_id: string
  mandalart_id: string
  checked_at: Date
}) => {
  trackEvent('action_checked', {
    action_id: data.action_id,
    action_type: data.action_type,
    sub_goal_id: data.sub_goal_id,
    mandalart_id: data.mandalart_id,
    hour: data.checked_at.getHours(), // 시간대 분석용
    day_of_week: data.checked_at.getDay(), // 요일 분석용
    timestamp: data.checked_at.toISOString()
  })
}

// 3. 배지 획득
export const trackBadgeUnlocked = (data: {
  badge_id: string
  badge_title: string
  badge_category: string
  xp_reward: number
  current_level: number
}) => {
  trackEvent('badge_unlocked', {
    badge_id: data.badge_id,
    badge_title: data.badge_title,
    badge_category: data.badge_category,
    xp_reward: data.xp_reward,
    current_level: data.current_level,
    timestamp: new Date().toISOString()
  })
}

// 4. 튜토리얼 완료
export const trackTutorialCompleted = (data: {
  completed_steps: number
  total_steps: number
  time_spent_seconds: number
  skipped: boolean
}) => {
  trackEvent('tutorial_completed', {
    completed_steps: data.completed_steps,
    total_steps: data.total_steps,
    time_spent_seconds: data.time_spent_seconds,
    skipped: data.skipped,
    completion_rate: (data.completed_steps / data.total_steps) * 100,
    timestamp: new Date().toISOString()
  })
}

// 5. 알림 클릭
export const trackNotificationClicked = (data: {
  notification_type: string
  source: 'pwa_push' | 'in_app'
}) => {
  trackEvent('notification_clicked', {
    notification_type: data.notification_type,
    source: data.source,
    timestamp: new Date().toISOString()
  })
}

// ========================================
// 추가 이벤트 (Phase 8.1 완료 후 확장 가능)
// ========================================

// 주간 리포트 생성
export const trackWeeklyReportGenerated = (data: {
  week_start: string
  completion_rate: number
  total_checks: number
}) => {
  trackEvent('weekly_report_generated', {
    week_start: data.week_start,
    completion_rate: data.completion_rate,
    total_checks: data.total_checks,
    timestamp: new Date().toISOString()
  })
}

// 목표 진단 조회
export const trackGoalDiagnosisViewed = (data: {
  mandalart_id: string
  diagnosis_type: 'SMART' | 'general'
}) => {
  trackEvent('goal_diagnosis_viewed', {
    mandalart_id: data.mandalart_id,
    diagnosis_type: data.diagnosis_type,
    timestamp: new Date().toISOString()
  })
}

// 레벨 업
export const trackLevelUp = (data: {
  old_level: number
  new_level: number
  total_xp: number
}) => {
  trackEvent('level_up', {
    old_level: data.old_level,
    new_level: data.new_level,
    total_xp: data.total_xp,
    timestamp: new Date().toISOString()
  })
}

// 페이지 뷰 (자동 추적되지만 커스텀 속성 추가 가능)
export const trackPageView = (pageName: string, properties?: Record<string, unknown>) => {
  trackEvent('$pageview', {
    page_name: pageName,
    ...properties
  })
}

export default posthog
