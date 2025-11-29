/**
 * Sentry Error Tracking Integration for React Native
 *
 * 프로덕션 환경에서 발생하는 에러를 실시간으로 추적하고 모니터링합니다.
 */

import * as Sentry from '@sentry/react-native'

// 초기화 여부 추적
let isInitialized = false

/**
 * Sentry 초기화
 *
 * 환경변수에서 DSN을 가져와 Sentry를 초기화합니다.
 */
export const initSentry = (): void => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  const environment = process.env.EXPO_PUBLIC_APP_ENV || 'development'

  // 이미 초기화된 경우 스킵
  if (isInitialized) {
    return
  }

  // DSN이 없으면 초기화하지 않음
  if (!dsn) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Sentry] DSN not found. Error tracking disabled.')
    }
    return
  }

  // 개발 환경에서는 Sentry 비활성화
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Sentry] Disabled in development mode')
    return
  }

  Sentry.init({
    dsn,
    environment,

    // 성능 모니터링 샘플링 비율 (10%)
    tracesSampleRate: 0.1,

    // 에러 필터링
    beforeSend(event, hint) {
      const error = hint.originalException

      // 특정 에러 타입 무시
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as Error).message

        // 네트워크 에러 무시
        if (message.includes('Network request failed')) {
          return null
        }

        // 타임아웃 에러 무시
        if (message.includes('timeout')) {
          return null
        }
      }

      return event
    },

    // 브레드크럼 최대 개수
    maxBreadcrumbs: 50,

    // 디버그 모드 (개발용)
    debug: false,

    // React Native 네비게이션 추적
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
  })

  isInitialized = true
  // eslint-disable-next-line no-console
  console.log('[Sentry] Initialized successfully')
}

/**
 * 사용자 컨텍스트 설정
 */
export const setSentryUser = (userId: string, email?: string): void => {
  if (!isInitialized) return

  Sentry.setUser({
    id: userId,
    email,
  })
}

/**
 * 사용자 컨텍스트 제거 (로그아웃 시)
 */
export const clearSentryUser = (): void => {
  if (!isInitialized) return

  Sentry.setUser(null)
}

/**
 * 커스텀 에러 캡처
 */
export const captureError = (
  error: Error,
  context?: Record<string, unknown>
): void => {
  if (!isInitialized) {
    // eslint-disable-next-line no-console
    console.error('[Sentry] Not initialized, error not captured:', error)
    return
  }

  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * 커스텀 메시지 캡처
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void => {
  if (!isInitialized) return

  Sentry.captureMessage(message, level)
}

/**
 * 컨텍스트 태그 추가
 */
export const setTag = (key: string, value: string): void => {
  if (!isInitialized) return

  Sentry.setTag(key, value)
}

/**
 * 브레드크럼 추가
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
): void => {
  if (!isInitialized) return

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * 네비게이션 상태 추적
 */
export const setNavigationRoute = (routeName: string): void => {
  if (!isInitialized) return

  Sentry.setContext('navigation', {
    route: routeName,
    timestamp: new Date().toISOString(),
  })

  addBreadcrumb(`Navigated to ${routeName}`, 'navigation', 'info')
}

export default Sentry
