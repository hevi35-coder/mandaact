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
  // Network errors
  NETWORK: '네트워크 연결을 확인해주세요',
  TIMEOUT: '요청 시간이 초과되었습니다. 다시 시도해주세요',

  // Auth errors
  AUTH_REQUIRED: '로그인이 필요합니다',
  AUTH_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다',
  USER_EXISTS: '이미 가입된 이메일입니다',
  EMAIL_NOT_CONFIRMED: '이메일 인증이 필요합니다. 메일함을 확인해주세요',
  WEAK_PASSWORD: '비밀번호는 최소 6자 이상이어야 합니다',
  INVALID_EMAIL: '올바른 이메일 형식이 아닙니다',
  USER_NOT_FOUND: '등록되지 않은 이메일입니다',
  TOO_MANY_REQUESTS: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요',
  SIGNUP_DISABLED: '현재 회원가입이 제한되어 있습니다',

  // Server errors
  SERVER_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
  NOT_FOUND: '요청한 데이터를 찾을 수 없습니다',
  PERMISSION_DENIED: '접근 권한이 없습니다',
  RATE_LIMIT: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',

  // Validation errors
  VALIDATION: '입력 정보를 확인해주세요',
  REQUIRED_FIELD: '필수 항목을 입력해주세요',

  // Generic
  UNKNOWN: '오류가 발생했습니다. 다시 시도해주세요',

  // Data errors
  LOAD_FAILED: '데이터를 불러오는 중 오류가 발생했습니다',
  SAVE_FAILED: '저장 중 오류가 발생했습니다',
  DELETE_FAILED: '삭제 중 오류가 발생했습니다',
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
    const message = error.message.toLowerCase()

    // Supabase Auth errors
    if (message.includes('jwt expired') || message.includes('token expired')) {
      return ERROR_MESSAGES.AUTH_EXPIRED
    }
    if (message.includes('invalid login credentials') || message.includes('invalid password')) {
      return ERROR_MESSAGES.INVALID_CREDENTIALS
    }
    if (message.includes('email not confirmed')) {
      return ERROR_MESSAGES.EMAIL_NOT_CONFIRMED
    }
    if (message.includes('user already registered') || message.includes('already exists')) {
      return ERROR_MESSAGES.USER_EXISTS
    }
    if (message.includes('password should be at least') || message.includes('weak password')) {
      return ERROR_MESSAGES.WEAK_PASSWORD
    }
    if (message.includes('invalid email') || message.includes('unable to validate email')) {
      return ERROR_MESSAGES.INVALID_EMAIL
    }
    if (message.includes('user not found') || message.includes('no user found')) {
      return ERROR_MESSAGES.USER_NOT_FOUND
    }
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return ERROR_MESSAGES.TOO_MANY_REQUESTS
    }
    if (message.includes('signup disabled') || message.includes('signups not allowed')) {
      return ERROR_MESSAGES.SIGNUP_DISABLED
    }

    // Network errors
    if (message.includes('network request failed') || message.includes('networkerror')) {
      return ERROR_MESSAGES.NETWORK
    }
    if (message.includes('fetch') && !message.includes('fetched')) {
      return ERROR_MESSAGES.NETWORK
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return ERROR_MESSAGES.TIMEOUT
    }
    if (message.includes('abort') || message.includes('cancelled')) {
      return ERROR_MESSAGES.NETWORK
    }

    // HTTP status errors
    if (message.includes('404') || message.includes('not found')) {
      return ERROR_MESSAGES.NOT_FOUND
    }
    if (message.includes('403') || message.includes('forbidden')) {
      return ERROR_MESSAGES.PERMISSION_DENIED
    }
    if (message.includes('401') || message.includes('unauthorized')) {
      return ERROR_MESSAGES.AUTH_REQUIRED
    }
    if (message.includes('429')) {
      return ERROR_MESSAGES.RATE_LIMIT
    }
    if (message.includes('500') || message.includes('internal server')) {
      return ERROR_MESSAGES.SERVER_ERROR
    }
    if (message.includes('502') || message.includes('503') || message.includes('504')) {
      return ERROR_MESSAGES.SERVER_ERROR
    }

    // Return the original message only if it's short and not technical
    if (error.message && error.message.length < 100 && !error.message.includes('Error:')) {
      return error.message
    }

    return ERROR_MESSAGES.UNKNOWN
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
