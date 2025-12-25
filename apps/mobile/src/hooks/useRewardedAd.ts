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
  | 'REWARDED_COACHING_SESSION'

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

const FALLBACK_REWARD_BY_AD_TYPE: Record<RewardedAdType, { type: string; amount: number }> = {
  REWARDED_REPORT_GENERATE: { type: 'report', amount: 1 },
  REWARDED_XP_BOOST: { type: 'xp_boost', amount: 1 },
  REWARDED_STREAK_FREEZE: { type: 'streak_freeze', amount: 1 },
  REWARDED_YESTERDAY_CHECK: { type: 'yesterday_check', amount: 1 },
  REWARDED_COACHING_SESSION: { type: 'coaching', amount: 1 },
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
  // Track if PAID event was received (ad generated revenue = ad was completed)
  const paidReceivedRef = useRef(false)
  // Track if reward was earned to trigger fallback on ad close
  const rewardEarnedRef = useRef(false)
  // Track if reward was already granted to prevent double rewards
  const rewardGrantedRef = useRef(false)
  // Track if ad actually opened before allowing fallback
  const didShowRef = useRef(false)

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
    paidReceivedRef.current = false // Reset paid tracking
    rewardEarnedRef.current = false // Reset reward tracking
    rewardGrantedRef.current = false // Reset reward grant tracking
    didShowRef.current = false // Reset ad shown tracking

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
        paidReceivedRef.current = false
        rewardEarnedRef.current = false
        rewardGrantedRef.current = false
        didShowRef.current = false
      }
    )

    const unsubOpened = rewardedAd.addAdEventListener(
      AdEventType.OPENED,
      () => {
        logger.info(`Rewarded ad opened: ${adType}`)
        didShowRef.current = true
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
        // PAID event = ad generated revenue = ad was completed successfully
        paidReceivedRef.current = true
        logger.info(`Rewarded ad PAID event received: ${adType}`)
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
        rewardEarnedRef.current = true // Mark reward as earned
        if (rewardGrantedRef.current) {
          logger.warn(`Reward already granted, skipping duplicate: ${adType}`)
          return
        }
        rewardGrantedRef.current = true
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

        // Fallback: Trigger reward if:
        // 1. EARNED_REWARD event didn't fire, AND
        // 2. PAID event was received (ad generated revenue = user completed the ad), AND
        // 3. Ad actually opened (avoid rewards on failed show)
        // This handles SDK bug where EARNED_REWARD doesn't fire but PAID does
        if (!rewardEarnedRef.current && paidReceivedRef.current && didShowRef.current) {
          logger.warn(
            `PAID received but EARNED_REWARD missing, triggering fallback reward: ${adType}`
          )
          if (!rewardGrantedRef.current) {
            rewardGrantedRef.current = true
            rewardEarnedRef.current = true
            onRewardEarned?.(FALLBACK_REWARD_BY_AD_TYPE[adType])
          }
        } else if (!rewardEarnedRef.current && !paidReceivedRef.current) {
          logger.info(
            `Ad closed without PAID event, user likely closed early: ${adType}`
          )
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
      rewardGrantedRef.current = false
      onRewardEarned?.({ type: 'skip', amount: 1 })
      return true
    }

    if (!isLoaded || !adRef.current) {
      logger.warn('Rewarded ad not ready to show')
      return false
    }

    try {
      didShowRef.current = false
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
