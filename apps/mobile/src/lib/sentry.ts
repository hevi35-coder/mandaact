/**
 * Sentry Error Tracking Integration for React Native (MOCKED)
 *
 * 프로덕션 환경에서 발생하는 에러를 실시간으로 추적하고 모니터링합니다.
 * 현재 빌드 오류 해결을 위해 Mock 처리됨.
 */

// import * as Sentry from '@sentry/react-native'

// 초기화 여부 추적
let isInitialized = false

/**
 * Sentry 초기화 (MOCKED)
 */
export const initSentry = (): void => {
  // eslint-disable-next-line no-console
  console.log('[Sentry] Mock initialized')
  isInitialized = true
}

/**
 * 사용자 컨텍스트 설정 (MOCKED)
 */
export const setSentryUser = (userId: string, email?: string): void => {
  // eslint-disable-next-line no-console
  console.log('[Sentry] Mock setUser', { userId, email })
}

/**
 * 사용자 컨텍스트 제거 (MOCKED)
 */
export const clearSentryUser = (): void => {
  // eslint-disable-next-line no-console
  console.log('[Sentry] Mock clearUser')
}

/**
 * 커스텀 에러 캡처 (MOCKED)
 */
export const captureError = (
  error: Error,
  context?: Record<string, unknown>
): void => {
  // eslint-disable-next-line no-console
  console.log('[Sentry] Mock captureError', error, context)
}

/**
 * 커스텀 메시지 캡처 (MOCKED)
 */
export const captureMessage = (
  message: string,
  level: string = 'info'
): void => {
  // eslint-disable-next-line no-console
  console.log('[Sentry] Mock captureMessage', message, level)
}

/**
 * 컨텍스트 태그 추가 (MOCKED)
 */
export const setTag = (key: string, value: string): void => {
  // eslint-disable-next-line no-console
  console.log('[Sentry] Mock setTag', key, value)
}

/**
 * 브레드크럼 추가 (MOCKED)
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  level: string = 'info',
  data?: Record<string, unknown>
): void => {
  // eslint-disable-next-line no-console
  console.log('[Sentry] Mock addBreadcrumb', message, category)
}

/**
 * 네비게이션 상태 추적 (MOCKED)
 */
export const setNavigationRoute = (routeName: string): void => {
  // eslint-disable-next-line no-console
  console.log('[Sentry] Mock setNavigationRoute', routeName)
}

export default {
  init: () => { },
  setUser: () => { },
  captureException: () => { },
  captureMessage: () => { },
  setTag: () => { },
  addBreadcrumb: () => { },
  setContext: () => { },
}
