/**
 * XP Boost Button Component
 *
 * Shows a button to watch a rewarded ad and earn 2x XP boost for 1 hour
 */

import React, { useState, useCallback } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { Play, Zap, Clock } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { useRewardedAd } from '../../hooks/useRewardedAd'
import { useAuthStore } from '../../store/authStore'
import { xpService } from '../../lib/xp'
import { useToast } from '../Toast'
import { logger } from '../../lib/logger'

interface XPBoostButtonProps {
  onBoostActivated?: () => void
}

export function XPBoostButton({ onBoostActivated }: XPBoostButtonProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const user = useAuthStore((state) => state.user)
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
    logger.error('XP Boost ad error', error)
    toast.error(t('common.error'), t('ads.loadError'))
  }, [toast, t])

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

  if (isLoading) {
    return (
      <View className="flex-row items-center justify-center bg-gray-100 rounded-xl px-4 py-3">
        <ActivityIndicator size="small" color="#6b7280" />
        <Text className="text-sm text-gray-500 ml-2">{t('ads.loading')}</Text>
      </View>
    )
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={!isLoaded || isActivating}
      className="overflow-hidden rounded-xl"
    >
      <LinearGradient
        colors={isLoaded ? ['#f59e0b', '#d97706'] : ['#9ca3af', '#6b7280']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-4 py-3"
      >
        <View className="flex-row items-center justify-center">
          {isActivating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Play size={16} color="#fff" fill="#fff" />
              <Zap size={16} color="#fff" className="ml-1" />
              <Text
                className="text-white text-sm ml-2"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('ads.xpBoost.button')}
              </Text>
            </>
          )}
        </View>
        <View className="flex-row items-center justify-center mt-1">
          <Clock size={12} color="rgba(255,255,255,0.8)" />
          <Text className="text-xs text-white/80 ml-1">
            {t('ads.xpBoost.duration')}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  )
}

export default XPBoostButton
