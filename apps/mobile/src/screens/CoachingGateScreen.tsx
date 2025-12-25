import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Header } from '../components'
import { Button } from '../components/ui'
import { useAuthStore } from '../store/authStore'
import { useCoachingStore } from '../store/coachingStore'
import { useCoachingAccessStore } from '../store/coachingAccessStore'
import { useSubscriptionContext } from '../context'
import { useRewardedAd } from '../hooks/useRewardedAd'
import { useMandalarts } from '../hooks/useMandalarts'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useToast } from '../components/Toast'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>
type GateMode = 'welcome' | 'ad' | 'limit' | 'loading'

export default function CoachingGateScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const toast = useToast()
  const { user } = useAuthStore()
  const { status } = useCoachingStore()
  const { isPremium, canCreateMandalart } = useSubscriptionContext()
  const {
    ensureCurrentWeek,
    registerSessionStart,
    weeklySessions,
    weeklyAdUnlocks,
    lifetimeSessions,
  } = useCoachingAccessStore()
  const { data: mandalarts = [], isLoading: mandalartsLoading } = useMandalarts(user?.id)
  const [gateMode, setGateMode] = useState<GateMode>('loading')
  const autoStartRef = useRef(false)

  const canStartWithAd = weeklySessions >= 1 && weeklyAdUnlocks < 1 && weeklySessions < 2
  const weeklyLimitReached = weeklySessions >= 2 || (weeklySessions >= 1 && weeklyAdUnlocks >= 1)
  const hasFreeSession = weeklySessions < 1
  const isFirstSession = lifetimeSessions === 0

  useEffect(() => {
    ensureCurrentWeek()
  }, [ensureCurrentWeek])

  useEffect(() => {
    if (status && status !== 'completed') {
      navigation.replace('CoachingFlow')
    }
  }, [navigation, status])

  useEffect(() => {
    if (mandalartsLoading) {
      setGateMode('loading')
      return
    }

    if (isPremium) {
      navigation.replace('CoachingFlow')
      return
    }

    if (!canCreateMandalart(mandalarts.length)) {
      navigation.replace('CoachingSlotGate')
      return
    }

    if (weeklyLimitReached) {
      setGateMode('limit')
      return
    }

    if (canStartWithAd) {
      setGateMode('ad')
      return
    }

    if (hasFreeSession && isFirstSession) {
      setGateMode('welcome')
      return
    }

    if (hasFreeSession && !autoStartRef.current) {
      autoStartRef.current = true
      registerSessionStart('free')
      navigation.replace('CoachingFlow')
    }
  }, [
    mandalartsLoading,
    isPremium,
    mandalarts.length,
    canCreateMandalart,
    weeklyLimitReached,
    canStartWithAd,
    hasFreeSession,
    isFirstSession,
    registerSessionStart,
    navigation,
  ])

  const handleStartFree = useCallback(() => {
    registerSessionStart('free')
    navigation.replace('CoachingFlow')
  }, [navigation, registerSessionStart])

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription')
  }, [navigation])

  const { isLoading: adLoading, show: showAd } = useRewardedAd({
    adType: 'REWARDED_COACHING_SESSION',
    onRewardEarned: () => {
      registerSessionStart('ad')
      navigation.replace('CoachingFlow')
    },
  })

  const handleWatchAd = useCallback(async () => {
    const shown = await showAd()
    if (!shown) {
      toast.error(t('coaching.gate.adError'))
    }
  }, [showAd, toast, t])

  const gateContent = useMemo(() => {
    if (gateMode === 'welcome') {
      return {
        title: t('coaching.gate.welcome.title'),
        body: t('coaching.gate.welcome.body'),
        primaryLabel: t('coaching.gate.welcome.primary'),
        secondaryLabel: t('coaching.gate.welcome.secondary'),
        primaryAction: handleStartFree,
        secondaryAction: handleUpgrade,
        showSecondary: true,
        footer: t('coaching.gate.footer'),
      }
    }

    if (gateMode === 'ad') {
      return {
        title: t('coaching.gate.ad.title'),
        body: t('coaching.gate.ad.body'),
        primaryLabel: t('coaching.gate.ad.primary'),
        secondaryLabel: t('coaching.gate.ad.secondary'),
        primaryAction: handleWatchAd,
        secondaryAction: handleUpgrade,
        showSecondary: true,
        footer: t('coaching.gate.footer'),
      }
    }

    if (gateMode === 'limit') {
      return {
        title: t('coaching.gate.limit.title'),
        body: t('coaching.gate.limit.body'),
        primaryLabel: t('coaching.gate.limit.primary'),
        secondaryLabel: t('coaching.gate.limit.secondary'),
        primaryAction: handleUpgrade,
        secondaryAction: () => navigation.goBack(),
        showSecondary: true,
        footer: t('coaching.gate.limit.footer'),
      }
    }

    return null
  }, [
    gateMode,
    handleStartFree,
    handleUpgrade,
    handleWatchAd,
    navigation,
    t,
  ])

  if (gateMode === 'loading' || !gateContent) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header showBackButton title={t('coaching.gate.title')} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#111827" />
          <Text className="text-gray-500 mt-3" style={{ fontFamily: 'Pretendard-Regular' }}>
            {t('common.loading')}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header showBackButton title={t('coaching.gate.title')} />
      <View className="flex-1 px-6 pt-8 pb-6">
        <View className="mb-6">
          <Text className="text-2xl text-gray-900" style={{ fontFamily: 'Pretendard-Bold' }}>
            {gateContent.title}
          </Text>
          <Text className="text-base text-gray-600 mt-3" style={{ fontFamily: 'Pretendard-Regular' }}>
            {gateContent.body}
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-6">
          <Text className="text-sm text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>
            {t('coaching.gate.summaryTitle')}
          </Text>
          <Text className="text-lg text-gray-900 mt-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>
            {t('coaching.gate.summaryValue', { used: weeklySessions, total: 2 })}
          </Text>
          <Text className="text-sm text-gray-500 mt-2" style={{ fontFamily: 'Pretendard-Regular' }}>
            {t('coaching.gate.summaryHint')}
          </Text>
        </View>

        <View className="mt-auto">
          <Button
            size="lg"
            onPress={gateContent.primaryAction}
            loading={gateMode === 'ad' && adLoading}
            className="w-full"
          >
            {gateContent.primaryLabel}
          </Button>
          {gateContent.showSecondary && gateContent.secondaryLabel && (
            <Pressable onPress={gateContent.secondaryAction} className="mt-3 items-center">
              <Text className="text-sm text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>
                {gateContent.secondaryLabel}
              </Text>
            </Pressable>
          )}
          <Text className="text-xs text-gray-400 text-center mt-4" style={{ fontFamily: 'Pretendard-Regular' }}>
            {gateContent.footer}
          </Text>
        </View>
      </View>
    </View>
  )
}
