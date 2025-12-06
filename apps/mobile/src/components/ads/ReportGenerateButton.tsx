/**
 * Report Generate Button Component
 *
 * Shows a button to watch a rewarded ad and generate a free report
 */

import React, { useState, useCallback } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { Play, FileText, Sparkles } from 'lucide-react-native'
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
    logger.error('Report generate ad error', error)
    toast.error(t('common.error'), t('ads.loadError'))
  }, [toast, t])

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

  const isDisabled = !isLoaded || isActivating || isLoading || disabled

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center rounded-xl px-4 py-3 ${
        isDisabled ? 'bg-gray-100' : 'bg-gradient-to-r from-purple-500 to-pink-500'
      }`}
      style={{
        backgroundColor: isDisabled ? '#f3f4f6' : '#7c3aed',
      }}
    >
      {isLoading || isActivating ? (
        <ActivityIndicator size="small" color={isDisabled ? '#9ca3af' : '#fff'} />
      ) : (
        <>
          <Play
            size={16}
            color={isDisabled ? '#9ca3af' : '#fff'}
            fill={isDisabled ? '#9ca3af' : '#fff'}
          />
          <Sparkles size={16} color={isDisabled ? '#9ca3af' : '#fff'} className="ml-1" />
          <Text
            className={`text-sm ml-2 ${isDisabled ? 'text-gray-400' : 'text-white'}`}
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('ads.reportGenerate.button')}
          </Text>
        </>
      )}
    </Pressable>
  )
}

export default ReportGenerateButton
