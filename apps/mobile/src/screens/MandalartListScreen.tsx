import React, { useState, useCallback } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  Plus,
  Grid3X3,
  Trash2,
  ChevronRight,
  Image as ImageIcon,
  Type,
} from 'lucide-react-native'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'

import {
  useMandalarts,
  useToggleMandalartActive,
  useDeleteMandalart,
} from '../hooks/useMandalarts'
import { useAuthStore } from '../store/authStore'
import type { RootStackParamList } from '../navigation/RootNavigator'
import type { Mandalart } from '@mandaact/shared'
import { logger } from '../lib/logger'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function MandalartListScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
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
  const deleteMandalart = useDeleteMandalart()

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

  const handleDelete = useCallback(
    (mandalart: Mandalart) => {
      Alert.alert(
        '만다라트 삭제',
        `"${mandalart.title}"을(를) 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 실천 기록이 함께 삭제됩니다.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteMandalart.mutateAsync(mandalart.id)
              } catch (err) {
                logger.error('Delete error', err)
                Alert.alert('오류', '삭제 중 오류가 발생했습니다.')
              }
            },
          },
        ]
      )
    },
    [deleteMandalart]
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
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#374151" />
        <Text className="text-gray-500 mt-4">불러오는 중...</Text>
      </SafeAreaView>
    )
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-4">
        <Text className="text-red-500 text-center">
          데이터를 불러오는 중 오류가 발생했습니다.
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="mt-4 bg-primary px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">다시 시도</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header - Web과 동일 */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Text className="text-2xl font-bold text-gray-900">만다라트</Text>
            <Text className="text-sm text-gray-500 ml-3">
              목표 관리 {mandalarts.length}개
            </Text>
          </View>
          <Pressable
            onPress={handleCreateNew}
            className="flex-row items-center active:opacity-70"
          >
            <Plus size={16} color="#667eea" />
            <Text className="text-primary text-sm font-medium ml-1">새로 만들기</Text>
          </Pressable>
        </View>

        {/* Empty State */}
        {mandalarts.length === 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]"
          >
            <Grid3X3 size={48} color="#d1d5db" />
            <Text className="text-lg font-semibold text-gray-900 mt-4 mb-2">
              만다라트가 없습니다
            </Text>
            <Text className="text-gray-500 text-center mb-4">
              새 만다라트를 생성해서{'\n'}목표 관리를 시작해보세요!
            </Text>
            <Pressable
              onPress={handleCreateNew}
              className="bg-primary px-6 py-3 rounded-xl flex-row items-center"
            >
              <Plus size={18} color="white" />
              <Text className="text-white font-semibold ml-2">새로 만들기</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Mandalart List */}
        {mandalarts.length > 0 && (
          <View className="space-y-3 pb-4">
            {mandalarts.map((mandalart, index) => (
              <Animated.View
                key={mandalart.id}
                entering={FadeInUp.delay(100 + index * 50).duration(400)}
              >
                <Pressable
                  onPress={() => handleViewDetail(mandalart)}
                  className={`bg-white rounded-2xl p-4 border ${
                    mandalart.is_active
                      ? 'border-primary/30'
                      : 'border-gray-200 opacity-70'
                  }`}
                  style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
                >
                {/* Header Row */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1">
                    {/* Input Method Icon */}
                    <View className="w-8 h-8 rounded-lg bg-gray-100 items-center justify-center mr-3">
                      {mandalart.input_method === 'image' ? (
                        <ImageIcon size={16} color="#6b7280" />
                      ) : (
                        <Type size={16} color="#6b7280" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold text-gray-900"
                        numberOfLines={1}
                      >
                        {mandalart.title}
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {format(new Date(mandalart.created_at), 'yyyy.MM.dd', {
                          locale: ko,
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Status Badge & Active Toggle */}
                  <View className="flex-row items-center">
                    {/* Status Badge */}
                    <View className={`px-2 py-0.5 rounded-full mr-3 ${
                      mandalart.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Text className={`text-xs font-medium ${
                        mandalart.is_active ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {mandalart.is_active ? '활성' : '비활성'}
                      </Text>
                    </View>
                    {/* Toggle Switch */}
                    {togglingIds.has(mandalart.id) ? (
                      <ActivityIndicator size="small" color="#374151" />
                    ) : (
                      <Switch
                        value={mandalart.is_active}
                        onValueChange={() => handleToggleActive(mandalart)}
                        trackColor={{ false: '#d1d5db', true: '#18181b' }}
                        thumbColor="white"
                      />
                    )}
                  </View>
                </View>

                {/* Center Goal */}
                <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
                  {mandalart.center_goal}
                </Text>

                {/* Footer Row */}
                <View className="flex-row items-center justify-between">
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation()
                      handleDelete(mandalart)
                    }}
                    className="p-2 -ml-2"
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </Pressable>

                  <View className="flex-row items-center">
                    <Text className="text-sm text-gray-600 mr-1">상세보기</Text>
                    <ChevronRight size={16} color="#6b7280" />
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
    </SafeAreaView>
  )
}
