/**
 * PostHog Analytics Integration for React Native
 *
 * 사용자 행동 분석 및 이벤트 추적
 */

import PostHog from 'posthog-react-native'
import type { PostHogEventProperties } from '@posthog/core'

// PostHog 클라이언트 인스턴스
let posthogClient: PostHog | null = null

/**
 * PostHog 초기화
 */
export const initPostHog = async (): Promise<void> => {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  // API 키가 없으면 초기화하지 않음
  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[PostHog] API key not found. Analytics disabled.')
    }
    return
  }

  // 이미 초기화된 경우 스킵
  if (posthogClient) {
    return
  }

  try {
    posthogClient = new PostHog(apiKey, {
      host,
      // 세션 리플레이 비활성화
      enableSessionReplay: false,
    })

    // eslint-disable-next-line no-console
    console.log('[PostHog] Initialized successfully')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[PostHog] Initialization failed:', error)
  }
}

/**
 * PostHog 클라이언트 가져오기
 */
export const getPostHog = (): PostHog | null => {
  return posthogClient
}

/**
 * 사용자 식별
 */
export const identifyUser = (
  userId: string,
  properties?: PostHogEventProperties
): void => {
  if (!posthogClient) return

  posthogClient.identify(userId, properties)
}

/**
 * 사용자 로그아웃 시 호출
 */
export const resetUser = (): void => {
  if (!posthogClient) return

  posthogClient.reset()
}

/**
 * 커스텀 이벤트 추적
 */
export const trackEvent = (
  eventName: string,
  properties?: PostHogEventProperties
): void => {
  if (!posthogClient) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[PostHog] Event not captured (not initialized): ${eventName}`)
    }
    return
  }

  posthogClient.capture(eventName, properties)
}

/**
 * 스크린 뷰 추적
 */
export const trackScreen = (
  screenName: string,
  properties?: PostHogEventProperties
): void => {
  if (!posthogClient) return

  posthogClient.screen(screenName, properties)
}

// ========================================
// 핵심 이벤트 추적 함수들
// ========================================

/**
 * 만다라트 생성
 */
export const trackMandalartCreated = (data: {
  mandalart_id: string
  input_method: 'image' | 'text' | 'manual'
  sub_goals_count: number
  actions_count: number
}): void => {
  trackEvent('mandalart_created', {
    ...data,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 액션 체크
 */
export const trackActionChecked = (data: {
  action_id: string
  action_type: 'routine' | 'mission' | 'reference'
  sub_goal_id: string
  mandalart_id: string
  checked_at: Date
}): void => {
  trackEvent('action_checked', {
    action_id: data.action_id,
    action_type: data.action_type,
    sub_goal_id: data.sub_goal_id,
    mandalart_id: data.mandalart_id,
    hour: data.checked_at.getHours(),
    day_of_week: data.checked_at.getDay(),
    platform: 'mobile',
    timestamp: data.checked_at.toISOString(),
  })
}

/**
 * 배지 획득
 */
export const trackBadgeUnlocked = (data: {
  badge_id: string
  badge_title: string
  badge_category: string
  xp_reward: number
  current_level: number
}): void => {
  trackEvent('badge_unlocked', {
    ...data,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 튜토리얼 완료
 */
export const trackTutorialCompleted = (data: {
  completed_steps: number
  total_steps: number
  time_spent_seconds?: number
  skipped: boolean
}): void => {
  trackEvent('tutorial_completed', {
    ...data,
    completion_rate: (data.completed_steps / data.total_steps) * 100,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 알림 클릭
 */
export const trackNotificationClicked = (data: {
  notification_type: string
  source: 'push' | 'in_app'
}): void => {
  trackEvent('notification_clicked', {
    ...data,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 레벨 업
 */
export const trackLevelUp = (data: {
  old_level: number
  new_level: number
  total_xp: number
}): void => {
  trackEvent('level_up', {
    ...data,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 주간 리포트 생성
 */
export const trackWeeklyReportGenerated = (data: {
  week_start: string
  completion_rate?: number
  total_checks?: number
  generated?: boolean
}): void => {
  trackEvent('weekly_report_generated', {
    ...data,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 목표 진단 조회
 */
export const trackGoalDiagnosisViewed = (data: {
  mandalart_id: string
  diagnosis_type?: 'SMART' | 'general'
  generated?: boolean
}): void => {
  trackEvent('goal_diagnosis_viewed', {
    ...data,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 앱 실행
 */
export const trackAppOpened = (): void => {
  trackEvent('app_opened', {
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 로그인
 */
export const trackLogin = (method: 'email' | 'google' | 'apple'): void => {
  trackEvent('user_logged_in', {
    method,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 회원가입
 */
export const trackSignup = (method: 'email' | 'google' | 'apple'): void => {
  trackEvent('user_signed_up', {
    method,
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

export default {
  initPostHog,
  getPostHog,
  identifyUser,
  resetUser,
  trackEvent,
  trackScreen,
  trackMandalartCreated,
  trackActionChecked,
  trackBadgeUnlocked,
  trackTutorialCompleted,
  trackNotificationClicked,
  trackLevelUp,
  trackWeeklyReportGenerated,
  trackGoalDiagnosisViewed,
  trackAppOpened,
  trackLogin,
  trackSignup,
}
