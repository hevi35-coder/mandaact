/**
 * Report Generate Button Component
 *
 * Shows a button to watch a rewarded ad and generate a free AI report
 * Styled to match app's card design pattern (same as XPBoostButton)
 */

import React, { useState, useCallback } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { Play, Sparkles } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useRewardedAd } from '../../hooks/useRewardedAd'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../Toast'
import { logger } from '../../lib/logger'

interface ReportGenerateButtonProps {
  onGenerateReport?: () => void
  disabled?: boolean
}

export function ReportGenerateButton({
  onGenerateReport,
  disabled = false,
}: ReportGenerateButtonProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const user = useAuthStore((state) => state.user)
  const [isActivating, setIsActivating] = useState(false)

  const handleRewardEarned = useCallback(async () => {
    if (!user?.id) return

    setIsActivating(true)
    try {
      toast.success(
        t('ads.reportGenerate.activated'),
        ''
      )

      // Trigger report generation in parent
      onGenerateReport?.()
      logger.info('Report generation activated via rewarded ad')
    } catch (error) {
      logger.error('Failed to activate report generation', error)
      toast.error(t('common.error'), t('ads.reportGenerate.error'))
    } finally {
      setIsActivating(false)
    }
  }, [user?.id, toast, t, onGenerateReport])

  const handleAdClosed = useCallback(() => {
    // Ad was closed, reload for next time
  }, [])

  const handleError = useCallback((error: Error) => {
    // Silently log error - don't show toast for preload failures
    // Users will see "ad not ready" message if they try to use the feature
    logger.warn('Report generate ad preload error', { message: error.message })
  }, [])

  const { isLoaded, isLoading, show } = useRewardedAd({
    adType: 'REWARDED_REPORT_GENERATE',
    onRewardEarned: handleRewardEarned,
    onAdClosed: handleAdClosed,
    onError: handleError,
  })

  const handlePress = useCallback(async () => {
    if (!isLoaded || isActivating || disabled) return

    const shown = await show()
    if (!shown) {
      Alert.alert(
        t('ads.notReady.title'),
        t('ads.notReady.message')
      )
    }
  }, [isLoaded, isActivating, disabled, show, t])

  // Loading state - compact style
  if (isLoading) {
    return (
      <Animated.View
        entering={FadeInUp.delay(100).duration(400)}
        className="bg-white rounded-2xl p-4 border border-gray-100"
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

  const isDisabled = !isLoaded || isActivating || disabled

  return (
    <Animated.View
      entering={FadeInUp.delay(100).duration(400)}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
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
      >
        <View className="flex-row items-center justify-between">
          {/* Left: Icon and Text */}
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: !isDisabled ? '#f3e8ff' : '#f3f4f6' }}
            >
              {isActivating ? (
                <ActivityIndicator size="small" color="#7c3aed" />
              ) : (
                <Sparkles size={20} color={!isDisabled ? '#7c3aed' : '#9ca3af'} />
              )}
            </View>
            <View className="flex-1">
              <Text
                className={`text-base ${!isDisabled ? 'text-gray-900' : 'text-gray-400'}`}
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('ads.reportGenerate.button')}
              </Text>
              <Text
                className="text-xs text-gray-400 mt-0.5"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('ads.reportGenerate.subtitle')}
              </Text>
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

export default ReportGenerateButton
