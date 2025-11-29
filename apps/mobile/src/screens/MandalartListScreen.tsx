import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native'
import { useScrollToTop } from '../navigation/RootNavigator'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  Plus,
  Grid3X3,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { Header } from '../components'

import {
  useMandalarts,
  useToggleMandalartActive,
} from '../hooks/useMandalarts'
import { useAuthStore } from '../store/authStore'
import type { RootStackParamList } from '../navigation/RootNavigator'
import type { Mandalart } from '@mandaact/shared'
import { logger } from '../lib/logger'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function MandalartListScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()

  // Scroll to top on tab re-press
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop('Mandalart', scrollRef)

  const [refreshing, setRefreshing] = useState(false)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

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
        Alert.alert('오류', '상태 변경 중 오류가 발생했습니다.')
      } finally {
        setTogglingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(mandalart.id)
          return newSet
        })
      }
    },
    [togglingIds, toggleActive]
  )

  const handleCreateNew = useCallback(() => {
    navigation.navigate('CreateMandalart')
  }, [navigation])

  const handleViewDetail = useCallback(
    (mandalart: Mandalart) => {
      navigation.navigate('MandalartDetail', { id: mandalart.id })
    },
    [navigation]
  )

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#374151" />
          <Text className="text-gray-500 mt-4">불러오는 중...</Text>
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
            데이터를 불러오는 중 오류가 발생했습니다.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">다시 시도</Text>
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
                만다라트
              </Text>
              <Text
                className="text-base text-gray-500 ml-3"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                목표 관리 • {mandalarts.length}개
              </Text>
            </View>
          </View>
          {/* 새로 만들기 버튼 - 웹과 동일하게 타이틀 아래 배치 */}
          <Pressable
            onPress={handleCreateNew}
            className="rounded-2xl overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <LinearGradient
              colors={['#2563eb', '#9333ea', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 1, borderRadius: 16 }}
            >
              <View className="bg-white rounded-2xl py-4 items-center justify-center">
                <MaskedView
                  maskElement={
                    <View className="flex-row items-center">
                      <Plus size={18} color="#000" />
                      <Text
                        className="text-base ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        새로 만들기
                      </Text>
                    </View>
                  }
                >
                  <LinearGradient
                    colors={['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View className="flex-row items-center opacity-0">
                      <Plus size={18} color="#000" />
                      <Text
                        className="text-base ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        새로 만들기
                      </Text>
                    </View>
                  </LinearGradient>
                </MaskedView>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Empty State */}
        {mandalarts.length === 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-6"
          >
            {/* Icon */}
            <View className="items-center mb-4">
              <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center">
                <Grid3X3 size={28} color="#9ca3af" />
              </View>
            </View>

            {/* Title & Description */}
            <Text
              className="text-lg text-gray-900 text-center mb-2"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              아직 만다라트가 없어요
            </Text>
            <Text
              className="text-sm text-gray-500 text-center mb-5"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              만다라트를 만들면{'\n'}체계적으로 목표를 관리할 수 있어요
            </Text>

            {/* Guide Box */}
            <View className="bg-gray-50 rounded-xl p-4 mb-5">
              <Text
                className="text-sm text-gray-700 mb-3"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                만다라트 만드는 방법
              </Text>
              <View className="flex-row items-center mb-2">
                <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                  이미지 업로드
                </Text>
              </View>
              <View className="flex-row items-center mb-2">
                <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                  텍스트 붙여넣기
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                  직접 입력
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-xl border border-gray-200 bg-white"
                onPress={() => navigation.navigate('Tutorial')}
              >
                <Text
                  className="text-sm text-gray-700 text-center"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  사용 가이드
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-xl overflow-hidden"
                onPress={handleCreateNew}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 1, borderRadius: 12 }}
                >
                  <View className="bg-white rounded-xl py-3 items-center justify-center">
                    <MaskedView
                      maskElement={
                        <Text
                          className="text-sm text-center"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          만다라트 생성
                        </Text>
                      }
                    >
                      <LinearGradient
                        colors={['#2563eb', '#9333ea', '#db2777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text
                          className="text-sm opacity-0"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          만다라트 생성
                        </Text>
                      </LinearGradient>
                    </MaskedView>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Mandalart List */}
        {mandalarts.length > 0 && (
          <View className="space-y-4 pb-5">
            {mandalarts.map((mandalart, index) => (
              <Animated.View
                key={mandalart.id}
                entering={FadeInUp.delay(100 + index * 50).duration(400)}
              >
                <Pressable
                  onPress={() => handleViewDetail(mandalart)}
                  className={`bg-white rounded-3xl p-5 border border-gray-100 ${
                    !mandalart.is_active ? 'opacity-60' : ''
                  }`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                  }}
                >
                  {/* Header Row - 웹과 동일: 타이틀 + 토글 */}
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text
                        className="text-lg text-gray-900"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                        numberOfLines={1}
                      >
                        {mandalart.title}
                      </Text>
                      <Text
                        className="text-base text-gray-500 mt-1"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                        numberOfLines={2}
                      >
                        핵심 목표: {mandalart.center_goal}
                      </Text>
                    </View>

                    {/* Toggle Switch with Status Label */}
                    <View className="items-center pt-0.5">
                      {togglingIds.has(mandalart.id) ? (
                        <ActivityIndicator size="small" color="#374151" />
                      ) : (
                        <>
                          <Switch
                            value={mandalart.is_active}
                            onValueChange={() => handleToggleActive(mandalart)}
                            trackColor={{ false: '#d1d5db', true: '#2563eb' }}
                            thumbColor="white"
                          />
                          <Text
                            className={`text-xs mt-1 ${
                              mandalart.is_active ? 'text-indigo-500' : 'text-gray-400'
                            }`}
                            style={{ fontFamily: 'Pretendard-Medium' }}
                          >
                            {mandalart.is_active ? '활성' : '비활성'}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </View>
  )
}
