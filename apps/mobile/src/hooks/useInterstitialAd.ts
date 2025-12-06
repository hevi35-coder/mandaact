/**
 * useInterstitialAd Hook
 *
 * Manages interstitial ad loading, showing with frequency capping
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads'
import {
  AD_UNITS,
  getNewUserAdRestriction,
  canShowInterstitial,
  markInterstitialShown,
} from '../lib/ads'
import { useAuthStore } from '../store/authStore'
import { logger } from '../lib/logger'

type InterstitialAdType =
  | 'INTERSTITIAL_AFTER_CREATE'
  | 'INTERSTITIAL_AFTER_REPORT'
  | 'INTERSTITIAL_LEVEL_UP'

interface UseInterstitialAdOptions {
  adType: InterstitialAdType
  onAdClosed?: () => void
  onError?: (error: Error) => void
}

interface UseInterstitialAdReturn {
  isLoaded: boolean
  isLoading: boolean
  error: Error | null
  show: () => Promise<boolean>
  load: () => void
}

export function useInterstitialAd({
  adType,
  onAdClosed,
  onError,
}: UseInterstitialAdOptions): UseInterstitialAdReturn {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const user = useAuthStore((state) => state.user)
  const adRef = useRef<InterstitialAd | null>(null)
  const unsubscribersRef = useRef<(() => void)[]>([])

  // Check new user protection - don't show interstitial ads to new users
  const adRestriction = getNewUserAdRestriction(user?.created_at ?? null)
  const canShowAds = adRestriction === 'full'

  const adUnitId = AD_UNITS[adType]

  const cleanup = useCallback(() => {
    unsubscribersRef.current.forEach((unsub) => unsub())
    unsubscribersRef.current = []
    adRef.current = null
  }, [])

  const load = useCallback(() => {
    if (!canShowAds) {
      logger.info('Interstitial ad skipped - new user protection period')
      return
    }

    if (isLoading || isLoaded) return

    setIsLoading(true)
    setError(null)

    // Cleanup previous ad instance
    cleanup()

    // Create new ad instance
    const interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    })

    adRef.current = interstitialAd

    // Set up event listeners
    const unsubLoaded = interstitialAd.addAdEventListener(
      AdEventType.LOADED,
      () => {
        logger.info(`Interstitial ad loaded: ${adType}`)
        setIsLoaded(true)
        setIsLoading(false)
      }
    )

    const unsubClosed = interstitialAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        logger.info(`Interstitial ad closed: ${adType}`)
        setIsLoaded(false)
        onAdClosed?.()
        // Preload next ad
        setTimeout(() => load(), 1000)
      }
    )

    const unsubError = interstitialAd.addAdEventListener(
      AdEventType.ERROR,
      (err) => {
        logger.error(`Interstitial ad error: ${adType}`, err)
        const error = new Error(err.message || 'Failed to load interstitial ad')
        setError(error)
        setIsLoading(false)
        setIsLoaded(false)
        onError?.(error)
      }
    )

    unsubscribersRef.current = [unsubLoaded, unsubClosed, unsubError]

    // Load the ad
    interstitialAd.load()
  }, [adType, adUnitId, canShowAds, isLoading, isLoaded, cleanup, onAdClosed, onError])

  const show = useCallback(async (): Promise<boolean> => {
    // Check new user protection
    if (!canShowAds) {
      logger.info('Interstitial ad show skipped - new user protection period')
      return false
    }

    // Check frequency cap
    if (!canShowInterstitial()) {
      logger.info('Interstitial ad show skipped - frequency cap')
      return false
    }

    if (!isLoaded || !adRef.current) {
      logger.warn('Interstitial ad not ready to show')
      return false
    }

    try {
      await adRef.current.show()
      markInterstitialShown()
      return true
    } catch (err) {
      logger.error('Failed to show interstitial ad', err)
      return false
    }
  }, [canShowAds, isLoaded])

  // Auto-load on mount if ads are allowed
  useEffect(() => {
    if (canShowAds) {
      load()
    }

    return cleanup
  }, [canShowAds]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isLoaded,
    isLoading,
    error,
    show,
    load,
  }
}

export default useInterstitialAd
