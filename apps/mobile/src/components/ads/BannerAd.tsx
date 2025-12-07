/**
 * Banner Ad Component
 *
 * Displays AdMob banner ads with proper error handling and loading states.
 * Respects Ad-Free Time (Focus Mode) when user has watched a rewarded ad.
 *
 * @see ADMOB_MONETIZATION_STRATEGY.md Section 3.1
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import {
  BannerAd as GoogleBannerAd,
  BannerAdSize,
  useForeground,
  TestIds,
} from 'react-native-google-mobile-ads'
import { AD_UNITS, getNewUserAdRestriction, isAdFreeActive } from '../../lib/ads'
import { useAuthStore } from '../../store/authStore'

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

export function BannerAd({ location, style }: BannerAdProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isAdFree, setIsAdFree] = useState(false)
  const user = useAuthStore((state) => state.user)
  const bannerRef = useRef<typeof GoogleBannerAd>(null)

  // iOS requires foreground refresh for ads - reload ad when app comes to foreground
  useForeground(() => {
    // Ad will be refreshed automatically by the SDK
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

  // Hide banner if Ad-Free mode is active or new user protection
  if (adRestriction === 'no_ads' || isAdFree) {
    return null
  }

  // Use TestIds.BANNER in development for guaranteed test ads
  const adUnitId = __DEV__ ? TestIds.BANNER : LOCATION_TO_AD_UNIT[location]

  const handleAdLoaded = useCallback((dimensions: { width: number; height: number }) => {
    if (__DEV__) {
      console.log('[BannerAd] Ad loaded:', location, dimensions)
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
  }, [location])

  // Don't render anything if there's an error
  if (hasError) {
    return null
  }

  return (
    <View style={[styles.container, style]}>
      <GoogleBannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailed}
      />
      {!isLoaded && (
        <View style={styles.placeholder}>
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
    minHeight: 50,
  },
  placeholder: {
    height: 50,
    backgroundColor: '#f0f0f0',
    width: '100%',
  },
})

export default BannerAd
