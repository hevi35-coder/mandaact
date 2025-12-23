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
import {
  trackAdClicked,
  trackAdFailed,
  trackAdImpression,
  trackAdRevenue,
  trackRewardEarned,
} from '../lib'

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
  // Track if ad was completed (watched fully) - only true when EARNED_REWARD fires
  const adCompletedRef = useRef(false)
  // Track if reward was earned to trigger fallback on ad close
  const rewardEarnedRef = useRef(false)

  // Check new user protection - don't show rewarded ads to new users (banner only period)
  const adRestriction = getNewUserAdRestriction(user?.created_at ?? null)
  const canShowAds = adRestriction === 'full'

  const adUnitId = AD_UNITS[adType]
  const placement = adType.toLowerCase()

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
    adCompletedRef.current = false // Reset ad completion tracking
    rewardEarnedRef.current = false // Reset reward tracking

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
        // Reset tracking flags when new ad is loaded
        adCompletedRef.current = false
        rewardEarnedRef.current = false
      }
    )

    const unsubOpened = rewardedAd.addAdEventListener(
      AdEventType.OPENED,
      () => {
        trackAdImpression({ ad_format: 'rewarded', placement, ad_unit_id: adUnitId })
      }
    )

    const unsubClicked = rewardedAd.addAdEventListener(
      AdEventType.CLICKED,
      () => {
        trackAdClicked({ ad_format: 'rewarded', placement, ad_unit_id: adUnitId })
      }
    )

    const unsubPaid = rewardedAd.addAdEventListener(
      AdEventType.PAID,
      (event) => {
        const paid = event as unknown as { value: number; currency: string; precision: string }
        trackAdRevenue({
          ad_format: 'rewarded',
          placement,
          ad_unit_id: adUnitId,
          revenue_micros: paid.value,
          currency: paid.currency,
          precision: String(paid.precision),
        })
      }
    )

    const unsubEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        logger.info(`Reward earned: ${reward.type} - ${reward.amount}`)
        adCompletedRef.current = true // Mark ad as completed (watched fully)
        rewardEarnedRef.current = true // Mark reward as earned
        trackRewardEarned({
          ad_format: 'rewarded',
          placement,
          ad_unit_id: adUnitId,
          reward_type: reward.type,
          reward_amount: reward.amount,
        })
        onRewardEarned?.(reward)
      }
    )

    const unsubClosed = rewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        logger.info(`Rewarded ad closed: ${adType}`)
        setIsLoaded(false)

        // Fallback: Only trigger if ad was completed but reward event didn't fire
        // This prevents rewarding users who closed the ad early
        if (adCompletedRef.current && !rewardEarnedRef.current) {
          logger.warn(
            `Ad completed but reward event missing, triggering fallback for: ${adType}`
          )
          onRewardEarned?.({ type: 'fallback', amount: 1 })
        } else if (!adCompletedRef.current) {
          logger.info(`Ad closed early without completion, no reward given: ${adType}`)
        }

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
        trackAdFailed({
          ad_format: 'rewarded',
          placement,
          ad_unit_id: adUnitId,
          error_code: err.message || 'rewarded_ad_error',
        })
        setError(error)
        setIsLoading(false)
        setIsLoaded(false)
        onError?.(error)
      }
    )

    unsubscribersRef.current = [
      unsubLoaded,
      unsubOpened,
      unsubClicked,
      unsubPaid,
      unsubEarned,
      unsubClosed,
      unsubError,
    ]

    // Load the ad
    rewardedAd.load()
  }, [adType, adUnitId, canShowAds, isLoading, isLoaded, cleanup, onRewardEarned, onAdClosed, onError, placement])

  const show = useCallback(async (): Promise<boolean> => {
    if (!canShowAds) {
      logger.info('Rewarded ad show skipped - new user protection period')
      // Trigger reward callback directly for new users (they get the feature for free)
      onRewardEarned?.({ type: 'skip', amount: 1 })
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
  }, [canShowAds, isLoaded, onRewardEarned])

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
