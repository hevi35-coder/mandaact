/**
 * PostHog Analytics Integration for React Native
 *
 * 사용자 행동 분석 및 이벤트 추적
 */

import PostHog from 'posthog-react-native'
import type { PostHogEventProperties } from '@posthog/core'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  POSTHOG_EVENTS,
  buildMandalartCreatedProps,
  buildActionCheckedProps,
  buildActionTypeSuggestedProps,
  buildBadgeUnlockedProps,
  buildTutorialCompletedProps,
  buildNotificationClickedProps,
  buildLevelUpProps,
  buildWeeklyReportGeneratedProps,
  buildGoalDiagnosisViewedProps,
  buildLoginProps,
  buildPaywallViewedProps,
  buildPurchaseStartedProps,
  buildPurchaseResultProps,
  buildRestoreResultProps,
  buildPremiumStateChangedProps,
  buildAdEventBaseProps,
  buildAdRevenueProps,
  buildAdFailedProps,
  buildRewardEarnedProps,
  type MandalartCreatedData,
  type ActionCheckedData,
  type ActionTypeSuggestedData,
  type BadgeUnlockedData,
  type TutorialCompletedData,
  type NotificationClickedData,
  type LevelUpData,
  type WeeklyReportGeneratedData,
  type GoalDiagnosisViewedData,
  type PaywallViewedData,
  type PurchaseStartedData,
  type PurchaseResultData,
  type RestoreResultData,
  type PremiumStateChangedData,
  type AdEventBaseData,
  type AdRevenueData,
  type AdFailedData,
  type RewardEarnedData,
} from '@mandaact/shared'

// PostHog 클라이언트 인스턴스
let posthogClient: PostHog | null = null
let currentUserId: string | null = null

const FIRST_SUCCESS_KEY_PREFIX = 'first_success:v1'

async function markFirstSuccessOnce(eventKey: string): Promise<boolean | undefined> {
  if (!currentUserId) return undefined

  const storageKey = `${FIRST_SUCCESS_KEY_PREFIX}:${currentUserId}:${eventKey}`

  try {
    const existing = await AsyncStorage.getItem(storageKey)
    if (existing === '1') return false

    await AsyncStorage.setItem(storageKey, '1')
    return true
  } catch {
    return undefined
  }
}

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
  currentUserId = userId

  if (!posthogClient) return
  posthogClient.identify(userId, properties)
}

/**
 * 사용자 로그아웃 시 호출
 */
export const resetUser = (): void => {
  currentUserId = null

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
  if (!posthogClient) {
    trackEvent(
      POSTHOG_EVENTS.MANDALART_CREATED,
      buildMandalartCreatedProps(data, 'mobile')
    )
    return
  }

  void (async () => {
    const isFirst = await markFirstSuccessOnce(POSTHOG_EVENTS.MANDALART_CREATED)
    const mergedData = isFirst === undefined ? data : { ...data, is_first: isFirst }

    trackEvent(
      POSTHOG_EVENTS.MANDALART_CREATED,
      buildMandalartCreatedProps(mergedData, 'mobile')
    )
  })()
}

/**
 * 액션 체크
 */
export const trackActionChecked = (data: ActionCheckedData): void => {
  if (!posthogClient) {
    trackEvent(
      POSTHOG_EVENTS.ACTION_CHECKED,
      buildActionCheckedProps(data, 'mobile')
    )
    return
  }

  void (async () => {
    const isFirst = await markFirstSuccessOnce(POSTHOG_EVENTS.ACTION_CHECKED)
    const mergedData = isFirst === undefined ? data : { ...data, is_first: isFirst }

    trackEvent(
      POSTHOG_EVENTS.ACTION_CHECKED,
      buildActionCheckedProps(mergedData, 'mobile')
    )
  })()
}

/**
 * 액션 타입 추천(자동 분류) 노출/계산
 */
export const trackActionTypeSuggested = (data: ActionTypeSuggestedData): void => {
  trackEvent(
    POSTHOG_EVENTS.ACTION_TYPE_SUGGESTED,
    buildActionTypeSuggestedProps(data, 'mobile')
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
  if (!posthogClient) {
    trackEvent(
      POSTHOG_EVENTS.WEEKLY_REPORT_GENERATED,
      buildWeeklyReportGeneratedProps(data, 'mobile')
    )
    return
  }

  void (async () => {
    const isFirst = await markFirstSuccessOnce(POSTHOG_EVENTS.WEEKLY_REPORT_GENERATED)
    const mergedData = isFirst === undefined ? data : { ...data, is_first: isFirst }

    trackEvent(
      POSTHOG_EVENTS.WEEKLY_REPORT_GENERATED,
      buildWeeklyReportGeneratedProps(mergedData, 'mobile')
    )
  })()
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

// ========================================
// Monetization events
// ========================================

export const trackPaywallViewed = (data: PaywallViewedData): void => {
  trackEvent(
    POSTHOG_EVENTS.PAYWALL_VIEWED,
    buildPaywallViewedProps(data, 'mobile')
  )
}

export const trackPurchaseStarted = (data: PurchaseStartedData): void => {
  trackEvent(
    POSTHOG_EVENTS.PURCHASE_STARTED,
    buildPurchaseStartedProps(data, 'mobile')
  )
}

export const trackPurchaseSuccess = (data: PurchaseResultData): void => {
  trackEvent(
    POSTHOG_EVENTS.PURCHASE_SUCCESS,
    buildPurchaseResultProps(data, 'mobile')
  )
}

export const trackPurchaseFailed = (data: PurchaseResultData): void => {
  trackEvent(
    POSTHOG_EVENTS.PURCHASE_FAILED,
    buildPurchaseResultProps(data, 'mobile')
  )
}

export const trackRestoreStarted = (data: RestoreResultData): void => {
  trackEvent(
    POSTHOG_EVENTS.PURCHASE_RESTORE_STARTED,
    buildRestoreResultProps(data, 'mobile')
  )
}

export const trackRestoreSuccess = (data: RestoreResultData): void => {
  trackEvent(
    POSTHOG_EVENTS.PURCHASE_RESTORE_SUCCESS,
    buildRestoreResultProps(data, 'mobile')
  )
}

export const trackRestoreFailed = (data: RestoreResultData): void => {
  trackEvent(
    POSTHOG_EVENTS.PURCHASE_RESTORE_FAILED,
    buildRestoreResultProps(data, 'mobile')
  )
}

export const trackPremiumStateChanged = (data: PremiumStateChangedData): void => {
  trackEvent(
    POSTHOG_EVENTS.PREMIUM_STATE_CHANGED,
    buildPremiumStateChangedProps(data, 'mobile')
  )
}

export const trackAdImpression = (data: AdEventBaseData): void => {
  trackEvent(
    POSTHOG_EVENTS.AD_IMPRESSION,
    buildAdEventBaseProps(data, 'mobile')
  )
}

export const trackAdClicked = (data: AdEventBaseData): void => {
  trackEvent(
    POSTHOG_EVENTS.AD_CLICKED,
    buildAdEventBaseProps(data, 'mobile')
  )
}

export const trackAdRevenue = (data: AdRevenueData): void => {
  trackEvent(
    POSTHOG_EVENTS.AD_REVENUE,
    buildAdRevenueProps(data, 'mobile')
  )
}

export const trackAdFailed = (data: AdFailedData): void => {
  trackEvent(
    POSTHOG_EVENTS.AD_FAILED,
    buildAdFailedProps(data, 'mobile')
  )
}

export const trackRewardEarned = (data: RewardEarnedData): void => {
  trackEvent(
    POSTHOG_EVENTS.REWARD_EARNED,
    buildRewardEarnedProps(data, 'mobile')
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
  trackPaywallViewed,
  trackPurchaseStarted,
  trackPurchaseSuccess,
  trackPurchaseFailed,
  trackRestoreStarted,
  trackRestoreSuccess,
  trackRestoreFailed,
  trackPremiumStateChanged,
  trackAdImpression,
  trackAdClicked,
  trackAdRevenue,
  trackAdFailed,
  trackRewardEarned,
}
