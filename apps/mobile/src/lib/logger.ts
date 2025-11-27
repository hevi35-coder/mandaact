/**
 * Production-safe logger with Sentry integration
 * Replaces console.log/error/warn with environment-aware logging
 */
import * as Sentry from '@sentry/react-native'

// Check if we're in development mode
const __DEV__ = process.env.NODE_ENV !== 'production'

// Sentry DSN - set via environment variable
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN

// Initialize Sentry
let sentryInitialized = false

export function initSentry() {
  if (sentryInitialized || !SENTRY_DSN) {
    if (__DEV__ && !SENTRY_DSN) {
      // Only log once in dev if DSN is missing
    }
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  })

  sentryInitialized = true
}

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
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
    } else if (sentryInitialized) {
      Sentry.addBreadcrumb({
        category: 'info',
        message,
        data: context,
        level: 'info',
      })
    }
  },

  /**
   * Warning level - logged in development, breadcrumb in production
   */
  warn(message: string, context?: LogContext): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, context || '')
    } else if (sentryInitialized) {
      Sentry.addBreadcrumb({
        category: 'warning',
        message,
        data: context,
        level: 'warning',
      })
    }
  },

  /**
   * Error level - always captured, sent to Sentry in production
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, errorObj, context || '')
    }

    if (sentryInitialized) {
      Sentry.captureException(errorObj, {
        extra: {
          message,
          ...context,
        },
      })
    }
  },

  /**
   * Capture an exception with optional context
   */
  captureException(error: unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[EXCEPTION]', errorObj, context || '')
    }

    if (sentryInitialized) {
      Sentry.captureException(errorObj, {
        extra: context,
      })
    }
  },

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; email?: string }): void {
    if (sentryInitialized) {
      Sentry.setUser(user)
    }
  },

  /**
   * Clear user context (on logout)
   */
  clearUser(): void {
    if (sentryInitialized) {
      Sentry.setUser(null)
    }
  },

  /**
   * Add a breadcrumb for debugging
   */
  addBreadcrumb(
    category: string,
    message: string,
    data?: LogContext,
    level: Sentry.SeverityLevel = 'info'
  ): void {
    if (sentryInitialized) {
      Sentry.addBreadcrumb({
        category,
        message,
        data,
        level,
      })
    }
  },
}

export default logger
