/**
 * Environment variable validation
 * Validates required environment variables at runtime
 */

interface EnvConfig {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SENTRY_DSN?: string
  PROJECT_ID?: string
}

class EnvValidationError extends Error {
  constructor(missingVars: string[]) {
    super(`Missing required environment variables: ${missingVars.join(', ')}`)
    this.name = 'EnvValidationError'
  }
}

/**
 * Get and validate environment variables
 */
export function getEnv(): EnvConfig {
  const env: EnvConfig = {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    PROJECT_ID: process.env.EXPO_PUBLIC_PROJECT_ID,
  }

  return env
}

/**
 * Validate required environment variables
 * Call this at app startup
 */
export function validateEnv(): void {
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ] as const

  const missingVars = requiredVars.filter(
    (varName) => !process.env[varName]
  )

  if (missingVars.length > 0) {
    throw new EnvValidationError(missingVars)
  }
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return process.env.NODE_ENV !== 'production' || __DEV__
}

/**
 * Check if Sentry is configured
 */
export function isSentryConfigured(): boolean {
  return !!process.env.EXPO_PUBLIC_SENTRY_DSN
}

export default {
  getEnv,
  validateEnv,
  isDev,
  isSentryConfigured,
}
