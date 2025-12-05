/**
 * AdMob Advertisement Configuration
 *
 * iOS Ad Unit IDs for MandaAct app
 * Note: Android IDs will be added later
 */

import { Platform } from 'react-native'

// Test Ad Unit IDs (Google Official)
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/2934735716'
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/4411468910'
const TEST_REWARDED_ID = 'ca-app-pub-3940256099942544/1712485313'

// Production Ad Unit IDs (iOS)
const IOS_AD_UNITS = {
  // Banner Ads
  BANNER_HOME: 'ca-app-pub-3170834290529005/2326142365',
  BANNER_TODAY: 'ca-app-pub-3170834290529005/9354585142',
  BANNER_LIST: 'ca-app-pub-3170834290529005/5953739649',

  // Interstitial Ads
  INTERSTITIAL_AFTER_CREATE: 'ca-app-pub-3170834290529005/5349543913',
  INTERSTITIAL_AFTER_REPORT: 'ca-app-pub-3170834290529005/4640657973',
  INTERSTITIAL_LEVEL_UP: 'ca-app-pub-3170834290529005/3662618222',

  // Rewarded Ads
  REWARDED_REPORT_GENERATE: 'ca-app-pub-3170834290529005/4293830156',
  REWARDED_XP_BOOST: 'ca-app-pub-3170834290529005/1462269794',
  REWARDED_STREAK_FREEZE: 'ca-app-pub-3170834290529005/7921427436',
  REWARDED_YESTERDAY_CHECK: 'ca-app-pub-3170834290529005/9592041258',
} as const

// Android Ad Unit IDs (To be added later)
const ANDROID_AD_UNITS = {
  BANNER_HOME: TEST_BANNER_ID,
  BANNER_TODAY: TEST_BANNER_ID,
  BANNER_LIST: TEST_BANNER_ID,
  INTERSTITIAL_AFTER_CREATE: TEST_INTERSTITIAL_ID,
  INTERSTITIAL_AFTER_REPORT: TEST_INTERSTITIAL_ID,
  INTERSTITIAL_LEVEL_UP: TEST_INTERSTITIAL_ID,
  REWARDED_REPORT_GENERATE: TEST_REWARDED_ID,
  REWARDED_XP_BOOST: TEST_REWARDED_ID,
  REWARDED_STREAK_FREEZE: TEST_REWARDED_ID,
  REWARDED_YESTERDAY_CHECK: TEST_REWARDED_ID,
} as const

// Use test ads in development
const IS_DEV = __DEV__

/**
 * Get platform-specific ad unit ID
 */
export function getAdUnitId(
  adType: keyof typeof IOS_AD_UNITS
): string {
  if (IS_DEV) {
    // Use test ads in development
    if (adType.startsWith('BANNER')) return TEST_BANNER_ID
    if (adType.startsWith('INTERSTITIAL')) return TEST_INTERSTITIAL_ID
    if (adType.startsWith('REWARDED')) return TEST_REWARDED_ID
    return TEST_BANNER_ID
  }

  if (Platform.OS === 'ios') {
    return IOS_AD_UNITS[adType]
  }

  return ANDROID_AD_UNITS[adType]
}

// Export ad unit IDs by type for direct access
export const AD_UNITS = {
  // Banner
  BANNER_HOME: getAdUnitId('BANNER_HOME'),
  BANNER_TODAY: getAdUnitId('BANNER_TODAY'),
  BANNER_LIST: getAdUnitId('BANNER_LIST'),

  // Interstitial
  INTERSTITIAL_AFTER_CREATE: getAdUnitId('INTERSTITIAL_AFTER_CREATE'),
  INTERSTITIAL_AFTER_REPORT: getAdUnitId('INTERSTITIAL_AFTER_REPORT'),
  INTERSTITIAL_LEVEL_UP: getAdUnitId('INTERSTITIAL_LEVEL_UP'),

  // Rewarded
  REWARDED_REPORT_GENERATE: getAdUnitId('REWARDED_REPORT_GENERATE'),
  REWARDED_XP_BOOST: getAdUnitId('REWARDED_XP_BOOST'),
  REWARDED_STREAK_FREEZE: getAdUnitId('REWARDED_STREAK_FREEZE'),
  REWARDED_YESTERDAY_CHECK: getAdUnitId('REWARDED_YESTERDAY_CHECK'),
} as const

/**
 * Ad Configuration
 */
export const AD_CONFIG = {
  // Banner ad refresh interval (ms) - 60 seconds recommended
  BANNER_REFRESH_INTERVAL: 60000,

  // Interstitial frequency cap - show once per X minutes
  INTERSTITIAL_COOLDOWN: 3 * 60 * 1000, // 3 minutes

  // New user protection period (days)
  NEW_USER_NO_ADS_DAYS: 3,
  NEW_USER_BANNER_ONLY_DAYS: 7,

  // Daily interstitial limit
  DAILY_INTERSTITIAL_LIMIT: 5,

  // Request configuration
  REQUEST_NON_PERSONALIZED: false,
} as const

/**
 * Track last interstitial show time for frequency capping
 */
let lastInterstitialTime = 0

export function canShowInterstitial(): boolean {
  const now = Date.now()
  return now - lastInterstitialTime >= AD_CONFIG.INTERSTITIAL_COOLDOWN
}

export function markInterstitialShown(): void {
  lastInterstitialTime = Date.now()
}

/**
 * Check if user is in new user protection period
 */
export function getNewUserAdRestriction(
  userCreatedAt: Date | string | null
): 'no_ads' | 'banner_only' | 'full' {
  if (!userCreatedAt) return 'full'

  const createdDate = new Date(userCreatedAt)
  const now = new Date()
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSinceCreation < AD_CONFIG.NEW_USER_NO_ADS_DAYS) {
    return 'no_ads'
  }

  if (daysSinceCreation < AD_CONFIG.NEW_USER_BANNER_ONLY_DAYS) {
    return 'banner_only'
  }

  return 'full'
}
