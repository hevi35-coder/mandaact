/**
 * PostHog Analytics Integration for React Native
 *
 * 사용자 행동 분석 및 이벤트 추적
 */

import PostHog from 'posthog-react-native'
import type { PostHogEventProperties } from '@posthog/core'
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
  type LoginData,
} from '@mandaact/shared'

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
 * 커스텀 이벤트 추적 (내부 헬퍼)
 */
function trackEvent(
  eventName: string,
  properties?: PostHogEventProperties
): void {
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
// 핵심 이벤트 추적 함수들 (shared 사용)
// ========================================

/**
 * 만다라트 생성
 */
export const trackMandalartCreated = (data: MandalartCreatedData): void => {
  trackEvent(
    POSTHOG_EVENTS.MANDALART_CREATED,
    buildMandalartCreatedProps(data, 'mobile')
  )
}

/**
 * 액션 체크
 */
export const trackActionChecked = (data: ActionCheckedData): void => {
  trackEvent(
    POSTHOG_EVENTS.ACTION_CHECKED,
    buildActionCheckedProps(data, 'mobile')
  )
}

/**
 * 배지 획득
 */
export const trackBadgeUnlocked = (data: BadgeUnlockedData): void => {
  trackEvent(
    POSTHOG_EVENTS.BADGE_UNLOCKED,
    buildBadgeUnlockedProps(data, 'mobile')
  )
}

/**
 * 튜토리얼 완료
 */
export const trackTutorialCompleted = (data: TutorialCompletedData): void => {
  trackEvent(
    POSTHOG_EVENTS.TUTORIAL_COMPLETED,
    buildTutorialCompletedProps(data, 'mobile')
  )
}

/**
 * 알림 클릭
 */
export const trackNotificationClicked = (data: NotificationClickedData): void => {
  trackEvent(
    POSTHOG_EVENTS.NOTIFICATION_CLICKED,
    buildNotificationClickedProps(data, 'mobile')
  )
}

/**
 * 레벨 업
 */
export const trackLevelUp = (data: LevelUpData): void => {
  trackEvent(
    POSTHOG_EVENTS.LEVEL_UP,
    buildLevelUpProps(data, 'mobile')
  )
}

/**
 * 주간 리포트 생성
 */
export const trackWeeklyReportGenerated = (data: WeeklyReportGeneratedData): void => {
  trackEvent(
    POSTHOG_EVENTS.WEEKLY_REPORT_GENERATED,
    buildWeeklyReportGeneratedProps(data, 'mobile')
  )
}

/**
 * 목표 진단 조회
 */
export const trackGoalDiagnosisViewed = (data: GoalDiagnosisViewedData): void => {
  trackEvent(
    POSTHOG_EVENTS.GOAL_DIAGNOSIS_VIEWED,
    buildGoalDiagnosisViewedProps(data, 'mobile')
  )
}

/**
 * 앱 실행
 */
export const trackAppOpened = (): void => {
  trackEvent(POSTHOG_EVENTS.APP_OPENED, {
    platform: 'mobile',
    timestamp: new Date().toISOString(),
  })
}

/**
 * 로그인
 */
export const trackLogin = (method: 'email' | 'google' | 'apple'): void => {
  trackEvent(
    POSTHOG_EVENTS.USER_LOGGED_IN,
    buildLoginProps({ method }, 'mobile')
  )
}

/**
 * 회원가입
 */
export const trackSignup = (method: 'email' | 'google' | 'apple'): void => {
  trackEvent(
    POSTHOG_EVENTS.USER_SIGNED_UP,
    buildLoginProps({ method }, 'mobile')
  )
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

