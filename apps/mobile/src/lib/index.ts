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

// Sentry
export {
  setSentryUser,
  clearSentryUser,
  captureError,
  captureMessage,
  setTag,
  addBreadcrumb,
  setNavigationRoute,
} from './sentry'

// PostHog Analytics
export {
  initPostHog,
  getPostHog,
  identifyUser,
  resetUser,
  trackScreen,
  trackMandalartCreated,
  trackActionChecked,
  trackBadgeUnlocked,
  trackTutorialCompleted,
  trackNotificationClicked,
  trackLevelUp,
  trackWeeklyReportGenerated,
  trackGoalDiagnosisViewed,
  trackAppOpened,
  trackLogin,
  trackSignup,
  trackPaywallViewed,
  trackPurchaseStarted,
  trackPurchaseSuccess,
  trackPurchaseFailed,
  trackRestoreStarted,
  trackRestoreSuccess,
  trackRestoreFailed,
  trackPremiumStateChanged,
  trackAdImpression,
  trackAdClicked,
  trackAdRevenue,
  trackAdFailed,
  trackRewardEarned,
} from './posthog'

// Environment validation
export { getEnv, validateEnv, isDev, isSentryConfigured } from './env'

// AdMob
export {
  AD_UNITS,
  AD_CONFIG,
  getAdUnitId,
  canShowInterstitial,
  markInterstitialShown,
  getNewUserAdRestriction,
} from './ads'
