/**
 * XP Boost Button Component
 *
 * Shows a button to watch a rewarded ad and earn 2x XP boost for 1 hour
 * Styled to match app's card design pattern
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { Play, Zap } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useFocusEffect } from '@react-navigation/native'
import { useRewardedAd } from '../../hooks/useRewardedAd'
import { useAuthStore } from '../../store/authStore'
import { useSubscriptionContext } from '../../context'
import { xpService } from '../../lib/xp'
import { supabase } from '../../lib/supabase'
import { useToast } from '../Toast'
import { logger } from '../../lib/logger'

interface XPBoostButtonProps {
  onBoostActivated?: () => void
  /** If false, the button will not be rendered */
  hasActiveMandalarts?: boolean
}

export function XPBoostButton({ onBoostActivated, hasActiveMandalarts = true }: XPBoostButtonProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const user = useAuthStore((state) => state.user)
  const { isPremium } = useSubscriptionContext()
  const [isActivating, setIsActivating] = useState(false)
  const [boostExpiresAt, setBoostExpiresAt] = useState<Date | null>(null)
  const [isBoostLoading, setIsBoostLoading] = useState(true)

  const refreshBoostStatus = useCallback(async () => {
    if (!user?.id) return
    setIsBoostLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_bonus_xp')
        .select('expires_at')
        .eq('user_id', user.id)
        .eq('bonus_type', 'ad_boost')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        logger.warn('[XPBoostButton] Failed to fetch boost status', { message: error.message })
        setBoostExpiresAt(null)
        return
      }

      setBoostExpiresAt(data?.expires_at ? new Date(data.expires_at) : null)
    } finally {
      setIsBoostLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    refreshBoostStatus()
  }, [user?.id, refreshBoostStatus])

  // If the user activates boost on another tab/screen, refresh when this screen regains focus.
  useFocusEffect(
    useCallback(() => {
      refreshBoostStatus()
      return undefined
    }, [refreshBoostStatus])
  )

  // Local countdown (no network polling)
  const remainingMs = useMemo(() => {
    if (!boostExpiresAt) return 0
    return Math.max(0, boostExpiresAt.getTime() - Date.now())
  }, [boostExpiresAt])

  useEffect(() => {
    if (!boostExpiresAt) return
    const interval = setInterval(() => {
      const remaining = boostExpiresAt.getTime() - Date.now()
      if (remaining <= 0) {
        setBoostExpiresAt(null)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [boostExpiresAt])

  const isBoostActive = remainingMs > 0
  const remainingTimeFormatted = useMemo(() => formatRemainingTime(remainingMs), [remainingMs])

  const handleRewardEarned = useCallback(async () => {
    if (!user?.id) return

    setIsActivating(true)
    try {
      // Activate 2x XP boost for 1 hour
      const activated = await xpService.activateAdBoost(user.id)
      if (!activated) {
        throw new Error('activateAdBoost_failed')
      }

      await refreshBoostStatus()

      toast.success(
        t('ads.xpBoost.activated'),
        t('ads.xpBoost.activatedDesc')
      )

      onBoostActivated?.()
      logger.info('XP boost activated via rewarded ad')
    } catch (error) {
      logger.error('Failed to activate XP boost', error)
      toast.error(t('common.error'), t('ads.xpBoost.error'))
    } finally {
      setIsActivating(false)
    }
  }, [user?.id, toast, t, onBoostActivated])

  const handleAdClosed = useCallback(() => {
    // Ad was closed, reload for next time
  }, [])

  const handleError = useCallback((error: Error) => {
    // Silently log error - don't show toast for preload failures
    // Users will see "ad not ready" message if they try to use the feature
    logger.warn('XP Boost ad preload error', { message: error.message })
  }, [])

  const { isLoaded, isLoading, show } = useRewardedAd({
    adType: 'REWARDED_XP_BOOST',
    onRewardEarned: handleRewardEarned,
    onAdClosed: handleAdClosed,
    onError: handleError,
  })

  const handlePress = useCallback(async () => {
    if (isBoostActive) {
      toast.info(t('ads.xpBoost.activated'), t('ads.xpBoost.remaining', { time: remainingTimeFormatted }))
      return
    }
    if (!isLoaded || isActivating) return

    const shown = await show()
    if (!shown) {
      Alert.alert(
        t('ads.notReady.title'),
        t('ads.notReady.message')
      )
    }
  }, [isBoostActive, isLoaded, isActivating, show, t, toast, remainingTimeFormatted])

  // Don't render for premium users (ads-free benefit)
  if (isPremium) {
    return null
  }

  // Don't render if no active mandalarts
  if (!hasActiveMandalarts) {
    return null
  }

  // Loading state - compact style
  if (isLoading || isBoostLoading) {
    return (
      <Animated.View
        entering={FadeInUp.delay(100).duration(400)}
        className="bg-white rounded-2xl p-4 mb-5 border border-gray-100"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-center py-1">
          <ActivityIndicator size="small" color="#9ca3af" />
          <Text
            className="text-sm text-gray-400 ml-2"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            {t('ads.loading')}
          </Text>
        </View>
      </Animated.View>
    )
  }

  const title = t('ads.xpBoost.button')
  const subtitle = isBoostActive
    ? t('ads.xpBoost.remaining', '{{time}} 남음', { time: remainingTimeFormatted })
    : t('ads.xpBoost.duration')
  // Allow tapping while active (to show remaining-time toast). Only disable when activating,
  // or when inactive and the ad isn't ready.
  const isDisabled = isActivating || (!isBoostActive && !isLoaded)
  const isPrimary = isBoostActive || isLoaded

  return (
    <Animated.View
      entering={FadeInUp.delay(100).duration(400)}
      className="bg-white rounded-2xl mb-5 border border-gray-100 overflow-hidden"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        className="p-4 active:bg-gray-50"
        style={{ opacity: isDisabled ? 0.7 : 1 }}
      >
        <View className="flex-row items-center justify-between">
          {/* Left: Icon and Text */}
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: isPrimary ? '#fef3c7' : '#f3f4f6' }}
            >
              {isActivating ? (
                <ActivityIndicator size="small" color="#d97706" />
              ) : (
                <Zap size={20} color={isPrimary ? '#d97706' : '#9ca3af'} />
              )}
            </View>
            <View className="flex-1">
              <Text
                className={`text-base ${isPrimary ? 'text-gray-900' : 'text-gray-400'}`}
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {title}
              </Text>
              <Text
                className="text-xs text-gray-400 mt-0.5"
                style={{ fontFamily: 'Pretendard-Regular' }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            </View>
          </View>

          {isBoostActive ? (
            <View
              className="px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#fef3c7' }}
            >
              <Text
                className="text-amber-700 text-xs"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('ads.xpBoost.pill', '부스트 모드')}
              </Text>
            </View>
          ) : (
            <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-100">
              <Play size={14} color="#6b7280" fill="#6b7280" />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  )
}

export default XPBoostButton

function formatRemainingTime(ms: number): string {
  if (ms <= 0) return ''

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  }
  return `${minutes}분`
}
