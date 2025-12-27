import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Header } from '../components'
import { Button } from '../components/ui'
import { useAuthStore } from '../store/authStore'
import { useCoachingStore, PersonaType } from '../store/coachingStore'
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
  const { status, startSession } = useCoachingStore()
  const { isPremium, canCreateMandalart } = useSubscriptionContext()
  const {
    ensureCurrentWeek,
    registerSessionStart,
    weeklySessions,
    weeklyAdUnlocks,
    lifetimeSessions,
  } = useCoachingAccessStore()
  const { data: mandalarts = [], isLoading: mandalartsLoading } = useMandalarts(user?.id)
  const isFocused = useIsFocused()
  const [gateMode, setGateMode] = useState<GateMode>('loading')
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('working_professional')
  const autoStartRef = useRef(false)
  const navigationAttemptedRef = useRef(false)

  const canStartWithAd = weeklySessions >= 1 && weeklyAdUnlocks < 1 && weeklySessions < 2
  const weeklyLimitReached = weeklySessions >= 2 || (weeklySessions >= 1 && weeklyAdUnlocks >= 1)
  const hasFreeSession = weeklySessions < 1
  const isFirstSession = lifetimeSessions === 0

  useEffect(() => {
    ensureCurrentWeek()
  }, [ensureCurrentWeek])

  // Consolidated redirection logic
  useEffect(() => {
    if (!isFocused || navigationAttemptedRef.current) return

    // 1. Existing active session
    if (status && status !== 'completed') {
      navigationAttemptedRef.current = true
      navigation.replace('ConversationalCoaching')
      return
    }

    if (mandalartsLoading) {
      setGateMode('loading')
      return
    }

    // 2. Premium users auto-start
    if (isPremium) {
      navigationAttemptedRef.current = true
      navigation.replace('ConversationalCoaching')
      return
    }

    // 3. New mandalart check
    if (!canCreateMandalart(mandalarts.length)) {
      navigationAttemptedRef.current = true
      navigation.replace('CoachingSlotGate')
      return
    }

    // 4. Determine Gate Mode or Auto-start Free
    if (weeklyLimitReached) {
      setGateMode('limit')
    } else if (canStartWithAd) {
      setGateMode('ad')
    } else if (hasFreeSession && isFirstSession) {
      setGateMode('welcome')
    } else if (hasFreeSession) {
      if (!autoStartRef.current) {
        autoStartRef.current = true
        navigationAttemptedRef.current = true
        registerSessionStart('free')
        navigation.replace('ConversationalCoaching')
      }
    }
  }, [
    isFocused,
    status,
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

  const handleStartFree = useCallback(async () => {
    if (!user?.id) return
    await registerSessionStart('free')
    await startSession(user.id, selectedPersona)
    navigation.replace('ConversationalCoaching')
  }, [navigation, registerSessionStart, startSession, user?.id, selectedPersona])

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription')
  }, [navigation])

  const { isLoading: adLoading, show: showAd } = useRewardedAd({
    adType: 'REWARDED_COACHING_SESSION',
    onRewardEarned: async () => {
      if (!user?.id) return
      await registerSessionStart('ad')
      await startSession(user.id, selectedPersona)
      navigation.replace('ConversationalCoaching')
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

        {gateMode === 'welcome' && (
          <View className="space-y-3 mb-6">
            <Text className="text-sm text-gray-500 mb-1" style={{ fontFamily: 'Pretendard-Medium' }}>
              {t('coaching.step1.title')}
            </Text>
            {(['working_professional', 'student', 'freelancer', 'custom'] as PersonaType[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => setSelectedPersona(key)}
                className={`px-4 py-4 rounded-2xl border ${selectedPersona === key ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-base ${selectedPersona === key ? 'text-gray-900' : 'text-gray-600'}`}
                    style={{ fontFamily: selectedPersona === key ? 'Pretendard-SemiBold' : 'Pretendard-Regular' }}
                  >
                    {t(`coaching.step1.persona.${key}`)}
                  </Text>
                  {selectedPersona === key && (
                    <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                      <View className="w-2 h-2 rounded-full bg-white" />
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {gateMode !== 'welcome' && (
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
        )}

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
