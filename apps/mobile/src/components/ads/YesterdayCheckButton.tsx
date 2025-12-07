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
import { useYesterdayCheck } from '../../hooks/useActions'
import { useAuthStore } from '../../store/authStore'
import { useUserProfile } from '../../hooks/useUserProfile'
import { useXPUpdate, statsKeys } from '../../hooks/useStats'
import { useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const { timezone } = useUserProfile(user?.id)
  const [isActivating, setIsActivating] = useState(false)

  const yesterdayCheck = useYesterdayCheck()
  const { awardXP } = useXPUpdate()

  const handleRewardEarned = useCallback(async () => {
    if (!user?.id) return

    setIsActivating(true)
    try {
      // Insert check for yesterday
      const result = await yesterdayCheck.mutateAsync({
        actionId,
        userId: user.id,
        timezone,
      })

      // Award XP for yesterday's check (with yesterday's date for bonus calculation)
      try {
        const yesterdayDate = new Date(result.yesterdayDate)
        await awardXP(user.id, 10, yesterdayDate)
      } catch (xpError) {
        logger.error('XP award error for yesterday check', xpError)
        // Don't fail the operation if XP fails
      }

      // Invalidate stats to recalculate streak
      queryClient.invalidateQueries({ queryKey: statsKeys.user(user.id) })

      toast.success(
        t('ads.yesterdayCheck.activated'),
        t('ads.yesterdayCheck.activatedDesc')
      )

      onCheckCompleted?.()
      logger.info('Yesterday check activated via rewarded ad', { actionId, yesterdayDate: result.yesterdayDate })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (errorMessage === 'ALREADY_CHECKED') {
        toast.info(
          t('ads.yesterdayCheck.alreadyChecked'),
          t('ads.yesterdayCheck.alreadyCheckedDesc')
        )
      } else {
        logger.error('Failed to activate yesterday check', error)
        toast.error(t('common.error'), t('ads.yesterdayCheck.error'))
      }
    } finally {
      setIsActivating(false)
    }
  }, [user?.id, actionId, timezone, yesterdayCheck, awardXP, queryClient, toast, t, onCheckCompleted])

  const handleAdClosed = useCallback(() => {
    // Ad was closed, reload for next time
  }, [])

  const handleError = useCallback((error: Error) => {
    // Silently log error - don't show toast for preload failures
    // Users will see "ad not ready" message if they try to use the feature
    logger.warn('Yesterday check ad preload error', { message: error.message })
  }, [])

  // Use autoLoad: false to prevent automatic loading on mount
  // This prevents multiple ad instances when many YesterdayCheckButtons are rendered
  const { isLoaded, isLoading, show, load } = useRewardedAd({
    adType: 'REWARDED_YESTERDAY_CHECK',
    onRewardEarned: handleRewardEarned,
    onAdClosed: handleAdClosed,
    onError: handleError,
    autoLoad: false, // Prevent auto-load to avoid multiple simultaneous ad requests
  })

  const handlePress = useCallback(async () => {
    if (isActivating) return

    // If ad is not loaded yet, start loading and show alert
    if (!isLoaded) {
      load() // Start loading the ad
      Alert.alert(
        t('ads.notReady.title'),
        t('ads.notReady.message')
      )
      return
    }

    const shown = await show()
    if (!shown) {
      Alert.alert(
        t('ads.notReady.title'),
        t('ads.notReady.message')
      )
    }
  }, [isLoaded, isActivating, show, load, t])

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
