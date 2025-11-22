/**
 * Standardized error response utilities for Edge Functions
 */

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  timestamp: string
}

export interface SuccessResponse<T = unknown> {
  success: true
  data: T
  timestamp: string
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

// CORS headers for all responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

// Standard error codes
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// HTTP status code mapping
const statusCodeMap: Record<ErrorCode, number> = {
  [ErrorCodes.BAD_REQUEST]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.VALIDATION_ERROR]: 422,
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.DATABASE_ERROR]: 503,
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown
): Response {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  }

  return new Response(JSON.stringify(errorResponse), {
    status: statusCodeMap[code] || 500,
    headers: corsHeaders,
  })
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  const successResponse: SuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }

  return new Response(JSON.stringify(successResponse), {
    status,
    headers: corsHeaders,
  })
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  })
}

/**
 * Parse and validate request body
 */
export async function parseRequestBody<T>(req: Request): Promise<T> {
  try {
    const body = await req.json()
    return body as T
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

/**
 * Extract and validate JWT from authorization header
 */
export function extractJWT(req: Request): string {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header')
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization format')
  }

  return authHeader.replace('Bearer ', '')
}

/**
 * Log error with context (for debugging)
 */
export function logError(
  functionName: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  console.error(`[${functionName}] Error:`, {
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error,
    context,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandler(
  functionName: string,
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        return handleCors()
      }

      return await handler(req)
    } catch (error) {
      logError(functionName, error, {
        method: req.method,
        url: req.url,
      })

      // Determine appropriate error code
      let code: ErrorCode = ErrorCodes.INTERNAL_ERROR
      let message = 'An unexpected error occurred'

      if (error instanceof Error) {
        message = error.message

        // Map common error patterns to codes
        if (message.includes('authorization') || message.includes('Unauthorized')) {
          code = ErrorCodes.UNAUTHORIZED
        } else if (message.includes('validation') || message.includes('required')) {
          code = ErrorCodes.VALIDATION_ERROR
        } else if (message.includes('not found')) {
          code = ErrorCodes.NOT_FOUND
        } else if (message.includes('database') || message.includes('supabase')) {
          code = ErrorCodes.DATABASE_ERROR
        } else if (message.includes('API') || message.includes('external')) {
          code = ErrorCodes.EXTERNAL_SERVICE_ERROR
        }
      }

      return createErrorResponse(code, message)
    }
  }
}