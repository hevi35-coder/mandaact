/**
 * useRewardedAd Hook
 *
 * Manages rewarded ad loading, showing, and reward handling
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads'
import { AD_UNITS, getNewUserAdRestriction } from '../lib/ads'
import { useAuthStore } from '../store/authStore'
import { logger } from '../lib/logger'

type RewardedAdType =
  | 'REWARDED_REPORT_GENERATE'
  | 'REWARDED_XP_BOOST'
  | 'REWARDED_STREAK_FREEZE'
  | 'REWARDED_YESTERDAY_CHECK'

interface UseRewardedAdOptions {
  adType: RewardedAdType
  onRewardEarned?: (reward: { type: string; amount: number }) => void
  onAdClosed?: () => void
  onError?: (error: Error) => void
  /** If false, ad will not auto-load on mount. Call load() manually. Default: true */
  autoLoad?: boolean
}

interface UseRewardedAdReturn {
  isLoaded: boolean
  isLoading: boolean
  error: Error | null
  show: () => Promise<boolean>
  load: () => void
}

export function useRewardedAd({
  adType,
  onRewardEarned,
  onAdClosed,
  onError,
  autoLoad = true,
}: UseRewardedAdOptions): UseRewardedAdReturn {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const user = useAuthStore((state) => state.user)
  const adRef = useRef<RewardedAd | null>(null)
  const unsubscribersRef = useRef<(() => void)[]>([])

  // Check new user protection - don't show rewarded ads to new users (banner only period)
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
      logger.info('Rewarded ad skipped - new user protection period')
      return
    }

    if (isLoading || isLoaded) return

    setIsLoading(true)
    setError(null)

    // Cleanup previous ad instance
    cleanup()

    // Create new ad instance
    const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
    })

    adRef.current = rewardedAd

    // Set up event listeners
    const unsubLoaded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        logger.info(`Rewarded ad loaded: ${adType}`)
        setIsLoaded(true)
        setIsLoading(false)
      }
    )

    const unsubEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        logger.info(`Reward earned: ${reward.type} - ${reward.amount}`)
        onRewardEarned?.(reward)
      }
    )

    const unsubClosed = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        logger.info(`Rewarded ad closed: ${adType}`)
        setIsLoaded(false)
        onAdClosed?.()
        // Preload next ad
        setTimeout(() => load(), 1000)
      }
    )

    const unsubError = rewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (err) => {
        logger.error(`Rewarded ad error: ${adType}`, err)
        const error = new Error(err.message || 'Failed to load rewarded ad')
        setError(error)
        setIsLoading(false)
        setIsLoaded(false)
        onError?.(error)
      }
    )

    unsubscribersRef.current = [unsubLoaded, unsubEarned, unsubClosed, unsubError]

    // Load the ad
    rewardedAd.load()
  }, [adType, adUnitId, canShowAds, isLoading, isLoaded, cleanup, onRewardEarned, onAdClosed, onError])

  const show = useCallback(async (): Promise<boolean> => {
    if (!canShowAds) {
      logger.info('Rewarded ad show skipped - new user protection period')
      // Return true to allow the action without watching ad
      return true
    }

    if (!isLoaded || !adRef.current) {
      logger.warn('Rewarded ad not ready to show')
      return false
    }

    try {
      await adRef.current.show()
      return true
    } catch (err) {
      logger.error('Failed to show rewarded ad', err)
      return false
    }
  }, [canShowAds, isLoaded])

  // Auto-load on mount if ads are allowed and autoLoad is true
  useEffect(() => {
    if (canShowAds && autoLoad) {
      load()
    }

    return cleanup
  }, [canShowAds, autoLoad]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isLoaded: canShowAds ? isLoaded : true, // Always "ready" for new users (they skip ads)
    isLoading,
    error,
    show,
    load,
  }
}

export default useRewardedAd
