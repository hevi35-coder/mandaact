/**
 * Yesterday Check Button Component
 *
 * Shows a button to watch a rewarded ad and check yesterday's action
 */

import React, { useState, useCallback } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { Play, History, Clock } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useRewardedAd } from '../../hooks/useRewardedAd'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../Toast'
import { logger } from '../../lib/logger'

interface YesterdayCheckButtonProps {
  actionId: string
  actionTitle: string
  onCheckCompleted?: () => void
}

export function YesterdayCheckButton({
  actionId,
  actionTitle,
  onCheckCompleted,
}: YesterdayCheckButtonProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const user = useAuthStore((state) => state.user)
  const [isActivating, setIsActivating] = useState(false)

  const handleRewardEarned = useCallback(async () => {
    if (!user?.id) return

    setIsActivating(true)
    try {
      // This would be handled by the parent component
      // since it needs access to the check toggle mutation
      toast.success(
        t('ads.yesterdayCheck.activated'),
        t('ads.yesterdayCheck.activatedDesc')
      )

      onCheckCompleted?.()
      logger.info('Yesterday check activated via rewarded ad', { actionId })
    } catch (error) {
      logger.error('Failed to activate yesterday check', error)
      toast.error(t('common.error'), t('ads.yesterdayCheck.error'))
    } finally {
      setIsActivating(false)
    }
  }, [user?.id, actionId, toast, t, onCheckCompleted])

  const handleAdClosed = useCallback(() => {
    // Ad was closed, reload for next time
  }, [])

  const handleError = useCallback((error: Error) => {
    logger.error('Yesterday check ad error', error)
    toast.error(t('common.error'), t('ads.loadError'))
  }, [toast, t])

  const { isLoaded, isLoading, show } = useRewardedAd({
    adType: 'REWARDED_YESTERDAY_CHECK',
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

  // Compact inline button style
  return (
    <Pressable
      onPress={handlePress}
      disabled={!isLoaded || isActivating || isLoading}
      className="flex-row items-center bg-purple-50 rounded-lg px-3 py-2 active:bg-purple-100"
    >
      {isLoading || isActivating ? (
        <ActivityIndicator size="small" color="#7c3aed" />
      ) : (
        <>
          <History size={14} color={isLoaded ? '#7c3aed' : '#9ca3af'} />
          <Text
            className={`text-xs ml-1 ${isLoaded ? 'text-purple-600' : 'text-gray-400'}`}
            style={{ fontFamily: 'Pretendard-Medium' }}
          >
            {t('ads.yesterdayCheck.button')}
          </Text>
        </>
      )}
    </Pressable>
  )
}

export default YesterdayCheckButton
