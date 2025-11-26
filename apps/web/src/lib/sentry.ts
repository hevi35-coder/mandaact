/**
 * Sentry Error Tracking Integration
 *
 * 프로덕션 환경에서 발생하는 에러를 실시간으로 추적하고 모니터링합니다.
 */

import * as Sentry from '@sentry/react'

/**
 * Sentry 초기화
 *
 * 환경변수에서 DSN을 가져와 Sentry를 초기화합니다.
 * 프로덕션 환경에서만 활성화되도록 설정합니다.
 */
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  const environment = import.meta.env.MODE // 'development' or 'production'

  // DSN이 없으면 초기화하지 않음
  if (!dsn) {
    console.warn('Sentry DSN not found. Error tracking will be disabled.')
    return
  }

  // 개발 환경에서는 Sentry 비활성화 (선택사항)
  if (environment === 'development') {
    console.log('Sentry is disabled in development mode')
    return
  }

  Sentry.init({
    dsn,
    environment,

    // 통합 설정
    integrations: [
      // 브라우저 추적 (성능 모니터링)
      Sentry.browserTracingIntegration(),

      // 세션 리플레이 (선택사항 - 프라이버시 고려)
      // Sentry.replayIntegration({
      //   maskAllText: true,
      //   blockAllMedia: true,
      // }),
    ],

    // 성능 모니터링 샘플링 비율 (0.0 ~ 1.0)
    // 프로덕션: 10% 트래픽 추적 (비용 절감)
    tracesSampleRate: 0.1,

    // 세션 리플레이 샘플링 (비활성화)
    replaysSessionSampleRate: 0.0,

    // 에러 발생 시 리플레이 샘플링 (선택사항)
    replaysOnErrorSampleRate: 0.1,

    // 에러 필터링 (특정 에러 무시)
    beforeSend(event, hint) {
      const error = hint.originalException

      // 개발 환경 에러 무시
      if (environment === 'development') {
        return null
      }

      // 특정 에러 타입 무시 (예: 네트워크 에러)
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as Error).message

        // 예시: 네트워크 타임아웃 무시
        if (message.includes('timeout') || message.includes('network')) {
          return null
        }

        // 예시: 브라우저 확장 프로그램 에러 무시
        if (message.includes('chrome-extension://')) {
          return null
        }
      }

      return event
    },

    // 브레드크럼 (에러 발생 전 사용자 행동 기록)
    maxBreadcrumbs: 50,

    // 콘솔 로그를 브레드크럼으로 기록
    beforeBreadcrumb(breadcrumb) {
      // 개발 환경에서는 브레드크럼 기록 안 함
      if (environment === 'development') {
        return null
      }

      return breadcrumb
    },
  })

  console.log('Sentry initialized successfully')
}

/**
 * 사용자 컨텍스트 설정
 *
 * @param userId - 사용자 고유 ID
 * @param email - 사용자 이메일 (선택사항)
 */
export const setSentryUser = (userId: string, email?: string) => {
  Sentry.setUser({
    id: userId,
    email,
  })
}

/**
 * 사용자 컨텍스트 제거 (로그아웃 시)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null)
}

/**
 * 커스텀 에러 캡처
 *
 * @param error - 에러 객체
 * @param context - 추가 컨텍스트 정보
 */
export const captureError = (error: Error, context?: Record<string, unknown>) => {
  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * 커스텀 메시지 캡처 (경고 레벨)
 *
 * @param message - 메시지
 * @param level - 심각도 (error, warning, info)
 */
export const captureMessage = (
  message: string,
  level: 'error' | 'warning' | 'info' = 'info'
) => {
  Sentry.captureMessage(message, level)
}

/**
 * 컨텍스트 태그 추가
 *
 * @param key - 태그 키
 * @param value - 태그 값
 */
export const setTag = (key: string, value: string) => {
  Sentry.setTag(key, value)
}

/**
 * 브레드크럼 추가 (수동)
 *
 * @param message - 브레드크럼 메시지
 * @param category - 카테고리
 * @param level - 심각도
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  level: 'info' | 'warning' | 'error' = 'info'
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  })
}

export default Sentry
