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

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import {
  BannerAd as GoogleBannerAd,
  BannerAdSize,
  useForeground,
  TestIds,
} from 'react-native-google-mobile-ads'
import { AD_UNITS, getNewUserAdRestriction, isAdFreeActive } from '../../lib/ads'
import { useAuthStore } from '../../store/authStore'
import { useSubscriptionContextSafe } from '../../context'

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
  const [isAdFree, setIsAdFree] = useState(false)
  const [adHeight, setAdHeight] = useState(DEFAULT_BANNER_HEIGHT)
  const user = useAuthStore((state) => state.user)
  const bannerRef = useRef<typeof GoogleBannerAd>(null)

  // Check premium status - hide ads for premium users
  const subscription = useSubscriptionContextSafe()
  const isPremium = subscription?.isPremium ?? false

  // iOS requires foreground refresh for ads - reload ad when app comes to foreground
  useForeground(() => {
    // On iOS, reload the banner when app returns to foreground
    // WKWebView can terminate in suspended state, causing empty banners
    if (Platform.OS === 'ios' && bannerRef.current) {
      // The ref's load method triggers a reload
      try {
        (bannerRef.current as any)?.load?.()
      } catch {
        // Silently ignore if load method doesn't exist
      }
    }
    // Also check Ad-Free status on foreground
    isAdFreeActive().then(setIsAdFree)
  })

  // Check Ad-Free status on mount and periodically
  useEffect(() => {
    isAdFreeActive().then(setIsAdFree)

    // Check every minute for expiry
    const interval = setInterval(() => {
      isAdFreeActive().then(setIsAdFree)
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Check new user protection
  const adRestriction = getNewUserAdRestriction(user?.created_at ?? null)

  // Hide banner if Premium, Ad-Free mode is active, or new user protection
  if (isPremium || adRestriction === 'no_ads' || isAdFree) {
    return null
  }

  // Use TestIds.ADAPTIVE_BANNER in development for guaranteed test ads
  const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : LOCATION_TO_AD_UNIT[location]

  const handleAdLoaded = useCallback((dimensions: { width: number; height: number }) => {
    if (__DEV__) {
      console.log('[BannerAd] Ad loaded:', location, dimensions)
    }
    // Update height from actual ad dimensions
    if (dimensions?.height && dimensions.height > 0) {
      setAdHeight(dimensions.height)
    }
    setIsLoaded(true)
    setHasError(false)
  }, [location])

  const handleAdFailed = useCallback((error: Error) => {
    if (__DEV__) {
      console.warn(`[BannerAd] Failed (${location}):`, error.message)
    }
    setHasError(true)
    setIsLoaded(false)
    // Reset height to 0 when ad fails (hide container)
    setAdHeight(0)
  }, [location])

  // Handle size change for adaptive banners
  const handleSizeChange = useCallback((size: { width: number; height: number }) => {
    if (__DEV__) {
      console.log('[BannerAd] Size changed:', location, size)
    }
    if (size?.height && size.height > 0) {
      setAdHeight(size.height)
    }
  }, [location])

  // Don't render anything if there's an error
  if (hasError) {
    return null
  }

  return (
    <View style={[styles.container, { minHeight: adHeight }, style]}>
      <GoogleBannerAd
        ref={bannerRef as any}
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailed}
        onSizeChange={handleSizeChange}
      />
      {!isLoaded && (
        <View style={[styles.placeholder, { height: DEFAULT_BANNER_HEIGHT }]}>
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
