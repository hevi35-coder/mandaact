/**
 * Error handling utilities for React Native app
 */

// Error types
export class NetworkError extends Error {
  constructor(message: string = '네트워크 연결을 확인해주세요') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class AuthError extends Error {
  constructor(message: string = '로그인이 필요합니다') {
    super(message)
    this.name = 'AuthError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Error messages in Korean
export const ERROR_MESSAGES = {
  NETWORK: '네트워크 연결을 확인해주세요',
  AUTH_REQUIRED: '로그인이 필요합니다',
  AUTH_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
  SERVER_ERROR: '서버 오류가 발생했습니다',
  NOT_FOUND: '요청한 데이터를 찾을 수 없습니다',
  PERMISSION_DENIED: '접근 권한이 없습니다',
  UNKNOWN: '알 수 없는 오류가 발생했습니다',
  RATE_LIMIT: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
  VALIDATION: '입력 정보를 확인해주세요',
} as const

// Parse error and return user-friendly message
export function parseError(error: unknown): string {
  if (error instanceof NetworkError) {
    return error.message
  }

  if (error instanceof AuthError) {
    return error.message
  }

  if (error instanceof ValidationError) {
    return error.message
  }

  if (error instanceof Error) {
    // Supabase errors
    if (error.message.includes('JWT expired')) {
      return ERROR_MESSAGES.AUTH_EXPIRED
    }
    if (error.message.includes('Invalid login credentials')) {
      return '이메일 또는 비밀번호가 올바르지 않습니다'
    }
    if (error.message.includes('Email not confirmed')) {
      return '이메일 인증이 필요합니다'
    }
    if (error.message.includes('User already registered')) {
      return '이미 가입된 이메일입니다'
    }

    // Network errors
    if (error.message.includes('Network request failed')) {
      return ERROR_MESSAGES.NETWORK
    }
    if (error.message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK
    }

    // Generic errors
    if (error.message.includes('404')) {
      return ERROR_MESSAGES.NOT_FOUND
    }
    if (error.message.includes('403')) {
      return ERROR_MESSAGES.PERMISSION_DENIED
    }
    if (error.message.includes('429')) {
      return ERROR_MESSAGES.RATE_LIMIT
    }
    if (error.message.includes('500')) {
      return ERROR_MESSAGES.SERVER_ERROR
    }

    return error.message || ERROR_MESSAGES.UNKNOWN
  }

  return ERROR_MESSAGES.UNKNOWN
}

// Check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    )
  }

  return false
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: unknown) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options

  let lastError: unknown
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error
      }

      onRetry?.(attempt + 1, error)

      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * 2, maxDelay)
    }
  }

  throw lastError
}

// Log error (for debugging and analytics)
export function logError(error: unknown, context?: Record<string, unknown>): void {
  console.error('[Error]', {
    error,
    context,
    timestamp: new Date().toISOString(),
  })

  // TODO: Send to Sentry or other error tracking service
  // Sentry.captureException(error, { extra: context })
}
