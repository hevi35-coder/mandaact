// Mandalart hooks
export {
  mandalartKeys,
  useMandalarts,
  useActiveMandalarts,
  useMandalart,
  useMandalartWithDetails,
  useToggleMandalartActive,
  useDeleteMandalart,
} from './useMandalarts'

// Action hooks
export {
  actionKeys,
  useTodayActions,
  useToggleActionCheck,
  useUpdateAction,
} from './useActions'
export type { ActionWithContext } from './useActions'

// Stats hooks
export {
  statsKeys,
  useDailyStats,
  useUserGamification,
  useWeeklyStats,
  useHeatmapData,
  useSubGoalProgress,
} from './useStats'
export type { DailyStats, UserGamification, HeatmapData, SubGoalProgress } from './useStats'

// Report hooks
export {
  reportKeys,
  useWeeklyReport,
  useGenerateWeeklyReport,
  useGoalDiagnosis,
  useGenerateGoalDiagnosis,
  useReportHistory,
} from './useReports'
export type { WeeklyReport, GoalDiagnosis } from './useReports'

// Badge hooks
export {
  badgeKeys,
  useBadgeDefinitions,
  useUserBadges,
  useBadgeProgress,
  BADGE_CATEGORIES,
  BADGE_DEFINITIONS,
  getBadgesByCategory,
  isBadgeUnlocked,
  getBadgeUnlockDate,
} from './useBadges'
export type { BadgeDefinition, UserBadge, BadgeProgress } from './useBadges'

// Notification hooks
export { useNotifications } from './useNotifications'

// Responsive hooks
export {
  useResponsive,
  useResponsiveValue,
  createResponsiveStyle,
  BREAKPOINTS,
} from './useResponsive'
export type { DeviceType } from './useResponsive'

// User profile hooks (timezone, language)
export {
  useUserProfile,
  getDeviceTimezone,
  getUserTimezone,
} from './useUserProfile'
export type { UserProfile } from './useUserProfile'

// Ad hooks
export { useRewardedAd } from './useRewardedAd'
export { useInterstitialAd } from './useInterstitialAd'
export { useAdFree } from './useAdFree'

// Subscription hooks
export {
  useSubscription,
  initializeRevenueCat,
  hasActiveEntitlement,
  FREE_MANDALART_LIMIT,
  FREE_WEEKLY_REPORT_LIMIT,
} from './useSubscription'
export type { SubscriptionStatus, SubscriptionInfo } from './useSubscription'
