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
