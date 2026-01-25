/**
 * Ad-Free Button Component
 *
 * Allows users to watch a rewarded ad to get 24 hours of banner-free experience.
 * Shows remaining time when Ad-Free mode is active.
 *
 * @see ADMOB_MONETIZATION_STRATEGY.md Section 3.1
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { Shield, Clock } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useAdFree, useRewardedAd } from '../../hooks'
import { useSubscriptionContext } from '../../context'
import { useToast } from '../Toast'

interface AdFreeButtonProps {
  onActivated?: () => void
}

export function AdFreeButton({ onActivated }: AdFreeButtonProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { isPremium } = useSubscriptionContext()
  const { isAdFree, remainingTimeFormatted, isLoading: isAdFreeLoading, activate } = useAdFree()

  const { isLoading: isAdLoading, show: showAd } = useRewardedAd({
    adType: 'REWARDED_XP_BOOST', // Reuse XP boost ad unit for now
    onRewardEarned: async () => {
      try {
        await activate()
        toast.success(
          t('ads.adFree.activated'),
          t('ads.adFree.activatedDesc')
        )
        onActivated?.()
      } catch (error) {
        console.error('[AdFreeButton] Failed to activate:', error)
        toast.error(t('common.error'), t('ads.adFree.error'))
      }
    },
    onError: (error) => {
      console.error('[AdFreeButton] Ad error:', error)
      toast.error(t('common.error'), t('ads.loadError'))
    },
  })

  const handlePress = async () => {
    if (isAdFree) {
      // Already active, just show info
      toast.info(
        t('ads.adFree.alreadyActive'),
        t('ads.adFree.remaining', { time: remainingTimeFormatted })
      )
      return
    }

    await showAd()
  }

  // Don't render for premium users (always ad-free)
  if (isPremium) {
    return null
  }

  if (isAdFreeLoading) {
    return null
  }

  // When Ad-Free is active, show status badge
  if (isAdFree) {
    return (
      <View
        className="flex-row items-center bg-violet-50 rounded-xl px-4 py-3 mx-4 my-2"
        style={{
          borderWidth: 1,
          borderColor: '#ddd6fe',
        }}
      >
        <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center mr-3">
          <Shield size={20} color="#7c3aed" />
        </View>
        <View className="flex-1">
          <Text className="text-violet-900 font-semibold text-base">
            {t('ads.adFree.activeTitle')}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Clock size={12} color="#8b5cf6" />
            <Text className="text-violet-600 text-sm ml-1">
              {t('ads.adFree.remaining', { time: remainingTimeFormatted })}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  // When Ad-Free is not active, show activation button
  return (
    <Pressable
      onPress={handlePress}
      disabled={isAdLoading}
      className="flex-row items-center bg-white rounded-xl px-4 py-3 mx-4 my-2"
      style={{
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        opacity: isAdLoading ? 0.7 : 1,
      }}
    >
      <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center mr-3">
        {isAdLoading ? (
          <ActivityIndicator size="small" color="#7c3aed" />
        ) : (
          <Shield size={20} color="#7c3aed" />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-semibold text-base">
          {t('ads.adFree.button')}
        </Text>
        <Text className="text-gray-500 text-sm mt-0.5">
          {t('ads.adFree.subtitle')}
        </Text>
      </View>
    </Pressable>
  )
}

export default AdFreeButton
