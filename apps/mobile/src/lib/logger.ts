/**
 * Production-safe logger with Sentry integration
 *
 * 환경에 따라 적절한 로깅 수행
 * - Development: Console 로깅
 * - Production: Sentry 에러 추적
 */

import {
  initSentry as initSentrySDK,
  captureError,
  captureMessage,
  setSentryUser,
  clearSentryUser,
  addBreadcrumb as sentryAddBreadcrumb,
  setTag,
} from './sentry'
import { initPostHog } from './posthog'

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

/**
 * Sentry 및 PostHog 초기화
 */
export async function initSentry(): Promise<void> {
  // Sentry 초기화
  initSentrySDK()

  // PostHog 초기화
  await initPostHog()
}

/**
 * Main logger object - use this instead of console
 */
export const logger = {
  /**
   * Debug level - only logged in development
   */
  debug(message: string, context?: LogContext): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] ${message}`, context || '')
    }
  },

  /**
   * Info level - logged in development, breadcrumb in production
   */
  info(message: string, context?: LogContext): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, context || '')
    } else {
      sentryAddBreadcrumb(message, 'info', 'info', context)
    }
  },

  /**
   * Warning level - logged in development, breadcrumb + message in production
   */
  warn(message: string, context?: LogContext): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, context || '')
    } else {
      sentryAddBreadcrumb(message, 'warning', 'warning', context)
      captureMessage(message, 'warning')
    }
  },

  /**
   * Error level - always logged, captured in Sentry
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    const errorMsg = String(errorObj.message || message).toLowerCase()

    // Downgrade noisy background network errors to warn in DEV to avoid red screen
    const isNoisyNetworkError =
      errorMsg.includes('posthog') ||
      errorMsg.includes('no-fill') ||
      errorMsg.includes('network error while fetching')

    if (__DEV__ && isNoisyNetworkError) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN: Downgraded] ${message}`, errorObj, context || '')
      return
    }

    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, errorObj, context || '')

    // Production에서 Sentry로 캡처
    if (!__DEV__) {
      captureError(errorObj, { message, ...context })
    }
  },

  /**
   * Capture an exception with optional context
   */
  captureException(error: unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    const errorMsg = String(errorObj.message).toLowerCase()

    // Downgrade noisy background network errors to warn in DEV to avoid red screen
    const isNoisyNetworkError =
      errorMsg.includes('posthog') ||
      errorMsg.includes('no-fill') ||
      errorMsg.includes('network error while fetching')

    if (__DEV__ && isNoisyNetworkError) {
      // eslint-disable-next-line no-console
      console.warn('[EXCEPTION: Downgraded]', errorObj, context || '')
      return
    }

    // eslint-disable-next-line no-console
    console.error('[EXCEPTION]', errorObj, context || '')

    // Production에서 Sentry로 캡처
    if (!__DEV__) {
      captureError(errorObj, context)
    }
  },

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string }): void {
    setSentryUser(user.id, user.email)
  },

  /**
   * Clear user context (logout)
   */
  clearUser(): void {
    clearSentryUser()
  },

  /**
   * Add a breadcrumb for debugging
   */
  addBreadcrumb(
    category: string,
    message: string,
    data?: LogContext,
    level: 'info' | 'warning' | 'error' = 'info'
  ): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[BREADCRUMB:${category}] ${message}`, data || '')
    } else {
      sentryAddBreadcrumb(message, category, level, data)
    }
  },

  /**
   * Set a tag for error context
   */
  setTag(key: string, value: string): void {
    setTag(key, value)
  },
}

export default logger
