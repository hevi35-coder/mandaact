/**
 * MandalartListScreen - Refactored
 * 
 * Shows list of user's mandalarts with create/toggle functionality
 */

import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Modal,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { Crown, X } from 'lucide-react-native'
import { useScrollToTop } from '../navigation/RootNavigator'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { Header } from '../components'
import {
  useMandalarts,
  useToggleMandalartActive,
} from '../hooks/useMandalarts'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionContext, FREE_MANDALART_LIMIT } from '../context'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { logger } from '../lib/logger'
import {
  CreateButton,
  MandalartCard,
  EmptyState,
  type Mandalart,
} from '../components/MandalartList'
import { BannerAd } from '../components/ads'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function MandalartListScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const { canCreateMandalart, isPremium } = useSubscriptionContext()

  // iPad detection
  const { width: screenWidth } = useWindowDimensions()
  const isTablet = Platform.OS === 'ios' && screenWidth >= 768

  // Scroll to top on tab re-press
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop('Mandalart', scrollRef)

  const [refreshing, setRefreshing] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [showLimitModal, setShowLimitModal] = useState(false)

  // Data fetching
  const {
    data: mandalarts = [],
    isLoading,
    error,
    refetch,
  } = useMandalarts(user?.id)

  // Mutations
  const toggleActive = useToggleMandalartActive()

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const handleToggleActive = useCallback(
    async (mandalart: Mandalart) => {
      if (togglingIds.has(mandalart.id)) return

      setTogglingIds((prev) => new Set(prev).add(mandalart.id))

      try {
        await toggleActive.mutateAsync({
          id: mandalart.id,
          isActive: !mandalart.is_active,
        })
      } catch (err) {
        logger.error('Toggle error', err)
        Alert.alert(t('common.error'), t('errors.generic'))
      } finally {
        setTogglingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(mandalart.id)
          return newSet
        })
      }
    },
    [togglingIds, toggleActive, t]
  )

  const handleCreateNew = useCallback(() => {
    // Check mandalart limit for free users
    if (!canCreateMandalart(mandalarts.length)) {
      setShowLimitModal(true)
      return
    }
    navigation.navigate('CreateMandalart')
  }, [navigation, canCreateMandalart, mandalarts.length])

  const handleUpgradePremium = useCallback(() => {
    setShowLimitModal(false)
    navigation.navigate('Subscription')
  }, [navigation])

  const handleViewDetail = useCallback(
    (mandalart: Mandalart) => {
      navigation.navigate('MandalartDetail', { id: mandalart.id })
    },
    [navigation]
  )

  const handleShowTutorial = useCallback(() => {
    navigation.navigate('Tutorial')
  }, [navigation])

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#374151" />
          <Text className="text-gray-500 mt-4">{t('common.loading')}</Text>
        </View>
      </View>
    )
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-center">
            {t('errors.generic')}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5 pt-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Page Title - Center Aligned */}
        <View className="mb-5">
          <View className="items-center mb-4">
            <View className="flex-row items-center">
              <Text
                className="text-3xl text-gray-900"
                style={{ fontFamily: 'Pretendard-Bold' }}
              >
                {t('mandalart.list.title')}
              </Text>
              <Text
                className="text-base text-gray-500 ml-3"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {t('mandalart.list.subtitle')} • {t('mandalart.list.count', { count: mandalarts.length })}
              </Text>
            </View>
          </View>

          {/* Create Button */}
          <CreateButton onPress={handleCreateNew} />
        </View>

        {/* Empty State */}
        {mandalarts.length === 0 && (
          <EmptyState
            onCreateNew={handleCreateNew}
            onShowTutorial={handleShowTutorial}
          />
        )}

        {/* Mandalart List */}
        {mandalarts.length > 0 && (() => {
          // iPad: 2-column grid layout
          if (isTablet && mandalarts.length >= 2) {
            const leftColumn = mandalarts.filter((_, idx) => idx % 2 === 0)
            const rightColumn = mandalarts.filter((_, idx) => idx % 2 === 1)

            return (
              <View style={{ flexDirection: 'row', gap: 16 }} className="pb-5">
                {/* Left Column */}
                <View style={{ flex: 1 }}>
                  {leftColumn.map((mandalart) => (
                    <MandalartCard
                      key={mandalart.id}
                      mandalart={mandalart}
                      isToggling={togglingIds.has(mandalart.id)}
                      onPress={handleViewDetail}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </View>
                {/* Right Column */}
                <View style={{ flex: 1 }}>
                  {rightColumn.map((mandalart) => (
                    <MandalartCard
                      key={mandalart.id}
                      mandalart={mandalart}
                      isToggling={togglingIds.has(mandalart.id)}
                      onPress={handleViewDetail}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </View>
              </View>
            )
          }

          // Phone or single item: standard single-column layout
          return (
            <View className="space-y-4 pb-5">
              {mandalarts.map((mandalart) => (
                <MandalartCard
                  key={mandalart.id}
                  mandalart={mandalart}
                  isToggling={togglingIds.has(mandalart.id)}
                  onPress={handleViewDetail}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </View>
          )
        })()}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>

      {/* Banner Ad */}
      <BannerAd location="list" />

      {/* Premium Limit Modal */}
      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50 px-4"
          onPress={() => setShowLimitModal(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full overflow-hidden"
            style={{ maxWidth: 400 }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <Pressable
              onPress={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center z-10"
            >
              <X size={18} color="#6b7280" />
            </Pressable>

            {/* Content */}
            <View className="px-6 py-8">
              {/* Icon */}
              <View className="items-center mb-6">
                <View className="w-20 h-20 rounded-full bg-yellow-100 items-center justify-center mb-4">
                  <Crown size={40} color="#fbbf24" fill="#fbbf24" />
                </View>
                <Text
                  className="text-2xl text-gray-900 text-center mb-2"
                  style={{ fontFamily: 'Pretendard-Bold' }}
                >
                  {t('subscription.limitReached.title')}
                </Text>
                <Text
                  className="text-base text-gray-500 text-center"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  {t('subscription.limitReached.message', { count: FREE_MANDALART_LIMIT })}
                </Text>
              </View>

              {/* Premium Benefits */}
              <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <View className="flex-row items-center mb-3">
                  <Crown size={18} color="#fbbf24" fill="#fbbf24" />
                  <Text
                    className="text-gray-900 ml-2"
                    style={{ fontFamily: 'Pretendard-Bold' }}
                  >
                    Premium {t('subscription.benefits.title', { defaultValue: '혜택' })}
                  </Text>
                </View>
                <View className="space-y-2">
                  <View className="flex-row items-start">
                    <Text className="text-gray-700 mr-2">•</Text>
                    <Text
                      className="text-gray-800 flex-1"
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      {t('subscription.benefits.unlimitedMandalarts', { defaultValue: '무제한 만다라트 생성' })}
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Text className="text-gray-700 mr-2">•</Text>
                    <Text
                      className="text-gray-800 flex-1"
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      {t('subscription.benefits.noAds', { defaultValue: '모든 광고 제거' })}
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Text className="text-gray-700 mr-2">•</Text>
                    <Text
                      className="text-gray-800 flex-1"
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      {t('rewarded.reportGenerate.subtitle', { defaultValue: 'AI 리포트 즉시 생성' })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <Pressable
                onPress={handleUpgradePremium}
                className="mb-3 rounded-xl overflow-hidden"
              >
                <LinearGradient
                  colors={['#7c3aed', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 2, borderRadius: 12 }}
                >
                  <View className="bg-white rounded-[10px] py-4 items-center">
                    <MaskedView
                      maskElement={
                        <Text
                          className="text-lg text-center"
                          style={{ fontFamily: 'Pretendard-Bold' }}
                        >
                          {t('subscription.limitReached.upgrade')}
                        </Text>
                      }
                    >
                      <LinearGradient
                        colors={['#7c3aed', '#2563eb']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text
                          className="text-lg text-center opacity-0"
                          style={{ fontFamily: 'Pretendard-Bold' }}
                        >
                          {t('subscription.limitReached.upgrade')}
                        </Text>
                      </LinearGradient>
                    </MaskedView>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => setShowLimitModal(false)}
                className="py-3 items-center"
              >
                <Text
                  className="text-gray-400 text-base"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {t('subscription.limitReached.later')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
