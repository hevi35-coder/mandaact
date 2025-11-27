/**
 * Production-safe logger
 * Replaces console.log/error/warn with environment-aware logging
 *
 * Note: Sentry integration will be added in production builds
 * For now, this provides consistent logging without external dependencies
 */

// Check if we're in development mode
const __DEV__ = process.env.NODE_ENV !== 'production'

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

// Placeholder for future Sentry integration
export function initSentry(): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[Logger] Running in development mode (Sentry disabled)')
  }
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
   * Info level - logged in development
   */
  info(message: string, context?: LogContext): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[INFO] ${message}`, context || '')
    }
  },

  /**
   * Warning level - logged in development
   */
  warn(message: string, context?: LogContext): void {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[WARN] ${message}`, context || '')
    }
  },

  /**
   * Error level - always logged
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))

    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, errorObj, context || '')
  },

  /**
   * Capture an exception with optional context
   */
  captureException(error: unknown, context?: LogContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error))

    // eslint-disable-next-line no-console
    console.error('[EXCEPTION]', errorObj, context || '')
  },

  /**
   * Set user context for error tracking (no-op for now)
   */
  setUser(_user: { id: string; email?: string }): void {
    // Will be implemented with Sentry in production
  },

  /**
   * Clear user context (no-op for now)
   */
  clearUser(): void {
    // Will be implemented with Sentry in production
  },

  /**
   * Add a breadcrumb for debugging (no-op for now)
   */
  addBreadcrumb(
    _category: string,
    _message: string,
    _data?: LogContext,
    _level?: string
  ): void {
    // Will be implemented with Sentry in production
  },
}

export default logger
