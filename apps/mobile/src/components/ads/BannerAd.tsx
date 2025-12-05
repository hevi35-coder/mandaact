/**
 * Banner Ad Component
 *
 * Displays AdMob banner ads with proper error handling and loading states
 */

import React, { useState, useCallback, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import {
  BannerAd as GoogleBannerAd,
  BannerAdSize,
  useForeground,
} from 'react-native-google-mobile-ads'
import { AD_UNITS, getNewUserAdRestriction } from '../../lib/ads'
import { useAuthStore } from '../../store/authStore'

type BannerLocation = 'home' | 'today' | 'list'

interface BannerAdProps {
  location: BannerLocation
  style?: object
}

const LOCATION_TO_AD_UNIT: Record<BannerLocation, string> = {
  home: AD_UNITS.BANNER_HOME,
  today: AD_UNITS.BANNER_TODAY,
  list: AD_UNITS.BANNER_LIST,
}

export function BannerAd({ location, style }: BannerAdProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const user = useAuthStore((state) => state.user)
  const bannerRef = useRef<typeof GoogleBannerAd>(null)

  // iOS requires foreground refresh for ads - reload ad when app comes to foreground
  useForeground(() => {
    // Ad will be refreshed automatically by the SDK
  })

  // Check new user protection
  const adRestriction = getNewUserAdRestriction(user?.created_at ?? null)
  if (adRestriction === 'no_ads') {
    return null
  }

  const adUnitId = LOCATION_TO_AD_UNIT[location]

  const handleAdLoaded = useCallback(() => {
    setIsLoaded(true)
    setHasError(false)
  }, [])

  const handleAdFailed = useCallback((error: Error) => {
    console.warn(`Banner ad failed to load (${location}):`, error.message)
    setHasError(true)
    setIsLoaded(false)
  }, [location])

  // Don't render anything if there's an error
  if (hasError) {
    return null
  }

  return (
    <View style={[styles.container, !isLoaded && styles.hidden, style]}>
      <GoogleBannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailed}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  hidden: {
    opacity: 0,
    height: 0,
  },
})

export default BannerAd
