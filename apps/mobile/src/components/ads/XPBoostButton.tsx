/**
 * XP Boost Button Component
 *
 * Shows a button to watch a rewarded ad and earn 2x XP boost for 1 hour
 * Styled to match app's card design pattern
 */

import React, { useState, useCallback } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { Play, Zap, Clock, Sparkles } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useRewardedAd } from '../../hooks/useRewardedAd'
import { useAuthStore } from '../../store/authStore'
import { useSubscriptionContext } from '../../context'
import { xpService } from '../../lib/xp'
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

  const handleRewardEarned = useCallback(async () => {
    if (!user?.id) return

    setIsActivating(true)
    try {
      // Activate 2x XP boost for 1 hour
      await xpService.activateAdBoost(user.id)

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
    if (!isLoaded || isActivating) return

    const shown = await show()
    if (!shown) {
      Alert.alert(
        t('ads.notReady.title'),
        t('ads.notReady.message')
      )
    }
  }, [isLoaded, isActivating, show, t])

  // Don't render for premium users (ads-free benefit)
  if (isPremium) {
    return null
  }

  // Don't render if no active mandalarts
  if (!hasActiveMandalarts) {
    return null
  }

  // Loading state - compact style
  if (isLoading) {
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
        disabled={!isLoaded || isActivating}
        className="p-4 active:bg-gray-50"
      >
        <View className="flex-row items-center justify-between">
          {/* Left: Icon and Text */}
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: isLoaded ? '#fef3c7' : '#f3f4f6' }}
            >
              {isActivating ? (
                <ActivityIndicator size="small" color="#d97706" />
              ) : (
                <Zap size={20} color={isLoaded ? '#d97706' : '#9ca3af'} />
              )}
            </View>
            <View className="flex-1">
              <Text
                className={`text-base ${isLoaded ? 'text-gray-900' : 'text-gray-400'}`}
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('ads.xpBoost.button')}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Clock size={12} color="#9ca3af" />
                <Text
                  className="text-xs text-gray-400 ml-1"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  {t('ads.xpBoost.duration')}
                </Text>
              </View>
            </View>
          </View>

          {/* Right: Play Icon */}
          <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-100">
            <Play
              size={14}
              color="#6b7280"
              fill="#6b7280"
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  )
}

export default XPBoostButton
