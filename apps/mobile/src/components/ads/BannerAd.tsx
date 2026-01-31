/**
 * Banner Ad Component
 *
 * Displays AdMob banner ads with proper error handling and loading states.
 * Uses ANCHORED_ADAPTIVE_BANNER for dynamic height based on device screen.
 * Respects Ad-Free Time (Focus Mode) when user has watched a rewarded ad.
 *
 * @see ADMOB_MONETIZATION_STRATEGY.md Section 3.1
 * @see https://docs.page/invertase/react-native-google-mobile-ads/displaying-ads
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import {
  BannerAd as GoogleBannerAd,
  BannerAdSize,
  useForeground,
  TestIds,
  type PaidEvent,
} from 'react-native-google-mobile-ads'
import { AD_UNITS, getNewUserAdRestriction } from '../../lib/ads'
import { useAuthStore } from '../../store/authStore'
import { useAdFree } from '../../hooks'
import { useSubscriptionContextSafe } from '../../context'
import { trackAdClicked, trackAdFailed, trackAdImpression, trackAdRevenue } from '../../lib'
import { IS_SCREENSHOT_MODE } from '../../lib/config'

type BannerLocation = 'home' | 'today' | 'list' | 'reports'

interface BannerAdProps {
  location: BannerLocation
  style?: object
}

const LOCATION_TO_AD_UNIT: Record<BannerLocation, string> = {
  home: AD_UNITS.BANNER_HOME,
  today: AD_UNITS.BANNER_TODAY,
  list: AD_UNITS.BANNER_LIST,
  reports: AD_UNITS.BANNER_LIST, // Reuse list banner for reports
}

// Default banner height fallback
const DEFAULT_BANNER_HEIGHT = 50

export function BannerAd({ location, style }: BannerAdProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [adHeight, setAdHeight] = useState(DEFAULT_BANNER_HEIGHT)
  const [reloadSeq, setReloadSeq] = useState(0)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [bannerSize, setBannerSize] = useState(BannerAdSize.ANCHORED_ADAPTIVE_BANNER)
  const user = useAuthStore((state) => state.user)
  const { isAdFree, refresh: refreshAdFree } = useAdFree()
  const isLoadedRef = useRef(false)

  // Check premium status - hide ads for premium users
  const subscription = useSubscriptionContextSafe()
  const isPremium = subscription?.isPremium ?? false

  // Check new user protection
  const adRestriction = getNewUserAdRestriction(user?.created_at ?? null)

  // Use TestIds.ADAPTIVE_BANNER in development for guaranteed test ads
  const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : LOCATION_TO_AD_UNIT[location]
  const placement = `banner_${location}`

  const handleAdLoaded = useCallback((dimensions: { width: number; height: number }) => {
    if (__DEV__) {
      console.log('[BannerAd] Ad loaded:', location, dimensions)
    }
    // Update height from actual ad dimensions
    if (dimensions?.height && dimensions.height > 0) {
      setAdHeight(dimensions.height)
    }
    setIsLoaded(true)
    isLoadedRef.current = true
    setHasError(false)
    setRetryAttempt(0)
    setBannerSize(BannerAdSize.ANCHORED_ADAPTIVE_BANNER)
  }, [location])

  const handleAdFailed = useCallback((error: Error) => {
    if (__DEV__) {
      console.warn(`[BannerAd] Failed (${location}):`, error.message)
    }
    trackAdFailed({
      ad_format: 'banner',
      placement,
      ad_unit_id: adUnitId,
      error_code: error.message,
    })
    setIsLoaded(false)
    isLoadedRef.current = false
    setHasError(true)

    // If adaptive banner fails, try a fixed size once before backing off.
    if (bannerSize === BannerAdSize.ANCHORED_ADAPTIVE_BANNER) {
      setBannerSize(BannerAdSize.BANNER)
      setHasError(false)
      setReloadSeq((prev) => prev + 1)
      setAdHeight(DEFAULT_BANNER_HEIGHT)
      return
    }

    // Keep a placeholder height so the layout doesn't jump.
    setAdHeight(DEFAULT_BANNER_HEIGHT)
  }, [location, placement, adUnitId, bannerSize])

  const handleAdImpression = useCallback(() => {
    trackAdImpression({
      ad_format: 'banner',
      placement,
      ad_unit_id: adUnitId,
    })
  }, [placement, adUnitId])

  const handleAdClicked = useCallback(() => {
    trackAdClicked({
      ad_format: 'banner',
      placement,
      ad_unit_id: adUnitId,
    })
  }, [placement, adUnitId])

  const handleAdPaid = useCallback((event: PaidEvent) => {
    trackAdRevenue({
      ad_format: 'banner',
      placement,
      ad_unit_id: adUnitId,
      revenue_micros: event.value,
      currency: event.currency,
      precision: String(event.precision),
    })
  }, [placement, adUnitId])

  // Handle size change for adaptive banners
  const handleSizeChange = useCallback((size: { width: number; height: number }) => {
    if (__DEV__) {
      console.log('[BannerAd] Size changed:', location, size)
    }
    if (size?.height && size.height > 0) {
      setAdHeight(size.height)
    }
  }, [location])

  console.log('[BannerAd] 🎯 Subscription state check:', {
    location,
    hasSubscription: !!subscription,
    isPremium,
    subscriptionStatus: subscription?.subscriptionInfo?.status,
    subscriptionPlan: subscription?.subscriptionInfo?.plan,
    willRender: !isPremium,
  })

  // Log when premium status changes
  useEffect(() => {
    console.log('[BannerAd] 🔄 Premium status changed:', {
      location,
      isPremium,
      willHideAd: isPremium,
    })
  }, [isPremium, location])

  // iOS requires foreground refresh for ads - reload ad when app comes to foreground
  useForeground(() => {
    // On iOS, force-remount the banner when app returns to foreground.
    // WKWebView can terminate in suspended state, causing empty banners.
    if (Platform.OS === 'ios') {
      setReloadSeq((prev) => prev + 1)
    }
    // Also check Ad-Free status on foreground
    refreshAdFree()
  })

  // If banner load fails (e.g., "No fill" during app verification), retry with backoff.
  useEffect(() => {
    if (!hasError) return

    const backoffMs = Math.min(60000, 5000 * Math.pow(2, retryAttempt)) // 5s, 10s, 20s, 40s, 60s...
    const timeout = setTimeout(() => {
      setHasError(false)
      setReloadSeq((prev) => prev + 1)
      setRetryAttempt((prev) => prev + 1)
    }, backoffMs)

    return () => clearTimeout(timeout)
  }, [hasError, retryAttempt])

  // Watchdog: sometimes BannerAd never triggers loaded/failed callbacks (stuck empty banner).
  // If it stays unloaded for too long, force a retry so the UI doesn't show a permanent grey placeholder.
  useEffect(() => {
    isLoadedRef.current = false
    setIsLoaded(false)

    const timeout = setTimeout(() => {
      if (isLoadedRef.current) return
      setHasError(true)
    }, 15000)

    return () => clearTimeout(timeout)
  }, [location, reloadSeq, bannerSize])

  // Hide banner if Premium, Ad-Free mode is active, new user protection, or Screenshot Mode
  if (isPremium || adRestriction === 'no_ads' || isAdFree || IS_SCREENSHOT_MODE) {
    console.log('[BannerAd] 🚫 Ad hidden - reason:', {
      isPremium,
      adRestriction,
      isAdFree,
      IS_SCREENSHOT_MODE,
    })
    return null
  }

  console.log('[BannerAd] ✅ Showing ad for location:', location)

  const shouldCollapse = hasError && !isLoaded

  return (
    <View style={[styles.container, { minHeight: shouldCollapse ? 0 : adHeight }, style]}>
      <GoogleBannerAd
        key={`${location}-${reloadSeq}`}
        unitId={adUnitId}
        size={bannerSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailed}
        onSizeChange={handleSizeChange}
        onAdImpression={handleAdImpression}
        onAdClicked={handleAdClicked}
        onPaid={handleAdPaid}
      />
      {!isLoaded && (
        <View style={[styles.placeholder, { height: shouldCollapse ? 0 : DEFAULT_BANNER_HEIGHT }]}>
          {/* Loading placeholder */}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
    width: '100%',
  },
})

export default BannerAd
