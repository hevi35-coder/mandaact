// Supabase client
export { supabase } from './supabase'

// Query persistence
export {
  asyncStoragePersister,
  createPersistableQueryClient,
  persistOptions,
} from './queryPersister'

// Error handling
export {
  NetworkError,
  AuthError,
  ValidationError,
  ERROR_MESSAGES,
  parseError,
  isRetryableError,
  retryWithBackoff,
  logError,
} from './errorHandling'

// Logger (Sentry integration)
export { logger, initSentry } from './logger'
export type { LogLevel } from './logger'

// Environment validation
export { getEnv, validateEnv, isDev, isSentryConfigured } from './env'
