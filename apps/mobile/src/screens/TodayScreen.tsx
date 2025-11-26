import React, { useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Circle,
  RotateCw,
  Target,
  Lightbulb,
} from 'lucide-react-native'
import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { useAuthStore } from '../store/authStore'
import {
  useTodayActions,
  useToggleActionCheck,
  ActionWithContext,
} from '../hooks/useActions'
import { useDailyStats } from '../hooks/useStats'
import {
  shouldShowToday,
  getActionTypeLabel,
  formatTypeDetails,
  type ActionType,
} from '@mandaact/shared'
import type { Mandalart } from '@mandaact/shared'

// Action type icon component - colors match web exactly
function ActionTypeIcon({
  type,
  size = 16,
}: {
  type: ActionType
  size?: number
}) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#3b82f6" />  // Blue (web)
    case 'mission':
      return <Target size={size} color="#10b981" />    // Green (web)
    case 'reference':
      return <Lightbulb size={size} color="#f59e0b" /> // Amber (web)
    default:
      return null
  }
}

export default function TodayScreen() {
  const { user } = useAuthStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  )
  const [refreshing, setRefreshing] = useState(false)
  const [checkingActions, setCheckingActions] = useState<Set<string>>(new Set())

  // Date navigation
  const today = startOfDay(new Date())
  const isToday = isSameDay(selectedDate, today)

  const handlePreviousDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -1))
  }, [])

  const handleNextDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1))
  }, [])

  const handleToday = useCallback(() => {
    setSelectedDate(new Date())
  }, [])

  // Data fetching
  const {
    data: actions = [],
    isLoading,
    error,
    refetch,
  } = useTodayActions(user?.id, selectedDate)
  const { data: dailyStats, refetch: refetchStats } = useDailyStats(user?.id)

  // Mutations
  const toggleCheck = useToggleActionCheck()

  // Filter actions based on shouldShowToday logic
  const filteredActions = useMemo(() => {
    return actions.filter((action) => shouldShowToday(action))
  }, [actions])

  // Group actions by mandalart
  const actionsByMandalart = useMemo(() => {
    return filteredActions.reduce(
      (groups, action) => {
        const mandalartId = action.sub_goal.mandalart.id
        if (!groups[mandalartId]) {
          groups[mandalartId] = {
            mandalart: action.sub_goal.mandalart,
            actions: [],
          }
        }
        groups[mandalartId].actions.push(action)
        return groups
      },
      {} as Record<
        string,
        { mandalart: Mandalart; actions: ActionWithContext[] }
      >
    )
  }, [filteredActions])

  // Calculate progress (exclude reference actions)
  const nonReferenceActions = filteredActions.filter(
    (a) => a.type !== 'reference'
  )
  const checkedCount = nonReferenceActions.filter((a) => a.is_checked).length
  const totalCount = nonReferenceActions.length
  const progressPercentage =
    totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const toggleSection = useCallback((mandalartId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(mandalartId)) {
        newSet.delete(mandalartId)
      } else {
        newSet.add(mandalartId)
      }
      return newSet
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetch(), refetchStats()])
    setRefreshing(false)
  }, [refetch, refetchStats])

  const handleToggleCheck = useCallback(
    async (action: ActionWithContext) => {
      if (!user) return
      if (checkingActions.has(action.id)) return
      if (action.type === 'reference') return

      setCheckingActions((prev) => new Set(prev).add(action.id))

      try {
        await toggleCheck.mutateAsync({
          actionId: action.id,
          userId: user.id,
          isChecked: action.is_checked,
          checkId: action.check_id,
        })
      } catch (err) {
        console.error('Check toggle error:', err)
        Alert.alert('오류', '체크 상태를 변경하는 중 오류가 발생했습니다.')
      } finally {
        setCheckingActions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(action.id)
          return newSet
        })
      }
    },
    [user, checkingActions, toggleCheck]
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
        {/* Header */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold text-gray-900">
                {isToday ? '오늘의 실천' : '실천 기록'}
              </Text>
            </View>
            {/* Date Navigation */}
            <View className="flex-row items-center rounded-lg border border-gray-300 overflow-hidden">
              <Pressable
                onPress={handlePreviousDay}
                className="px-3 py-2 border-r border-gray-300 active:bg-gray-100"
              >
                <ChevronLeft size={18} color="#374151" />
              </Pressable>
              <Pressable
                onPress={handleToday}
                className="px-4 py-2 border-r border-gray-300 active:bg-gray-100"
              >
                <Text
                  className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}
                >
                  오늘
                </Text>
              </Pressable>
              <Pressable
                onPress={handleNextDay}
                className="px-3 py-2 active:bg-gray-100"
              >
                <ChevronRight size={18} color="#374151" />
              </Pressable>
            </View>
          </View>
          <Text className="text-gray-500 text-sm mt-2">
            {format(selectedDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
          </Text>
        </View>

        {/* Progress Card */}
        {filteredActions.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-5 mb-4 border border-gray-200"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-semibold text-gray-900">
                {isToday ? '오늘의 달성율' : '달성율'}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-2xl font-bold text-gray-900">
                  {progressPercentage}
                </Text>
                <Text className="text-lg text-gray-500 ml-1">%</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <Animated.View
                entering={FadeInUp.delay(300).duration(300)}
                className="h-full bg-gray-900 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </View>

            {/* Stats Row */}
            <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
              <View className="flex-row items-center">
                <RotateCw size={14} color="#3b82f6" />
                <Text className="text-xs text-gray-600 ml-1">
                  루틴 {filteredActions.filter((a) => a.type === 'routine' && a.is_checked).length}/
                  {filteredActions.filter((a) => a.type === 'routine').length}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Target size={14} color="#10b981" />
                <Text className="text-xs text-gray-600 ml-1">
                  미션 {filteredActions.filter((a) => a.type === 'mission' && a.is_checked).length}/
                  {filteredActions.filter((a) => a.type === 'mission').length}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Lightbulb size={14} color="#f59e0b" />
                <Text className="text-xs text-gray-600 ml-1">
                  참고 {filteredActions.filter((a) => a.type === 'reference').length}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Empty State */}
        {filteredActions.length === 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]"
          >
            <Text className="text-4xl mb-4">📋</Text>
            <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
              오늘 실천할 항목이 없습니다
            </Text>
            <Text className="text-gray-500 text-center">
              만다라트를 활성화하거나{'\n'}새로운 목표를 추가해보세요
            </Text>
          </Animated.View>
        )}

        {/* Actions List - Grouped by Mandalart */}
        {filteredActions.length > 0 && (
          <View className="space-y-4 pb-4">
            {Object.entries(actionsByMandalart).map(
              ([mandalartId, { mandalart, actions: mandalartActions }]) => {
                const isCollapsed = collapsedSections.has(mandalartId)
                const mandalartNonRef = mandalartActions.filter(
                  (a) => a.type !== 'reference'
                )
                const mandalartChecked = mandalartNonRef.filter(
                  (a) => a.is_checked
                ).length
                const mandalartTotal = mandalartNonRef.length

                return (
                  <View key={mandalartId} className="mb-4">
                    {/* Section Header */}
                    <Pressable
                      onPress={() => toggleSection(mandalartId)}
                      className="flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="text-base font-semibold text-gray-900">
                            {mandalart.title}
                          </Text>
                          <Text className="text-sm text-gray-500 ml-2">
                            {mandalartChecked}/{mandalartTotal}
                          </Text>
                        </View>
                        <Text
                          className="text-sm text-gray-500 mt-1"
                          numberOfLines={1}
                        >
                          {mandalart.center_goal}
                        </Text>
                      </View>
                      {isCollapsed ? (
                        <ChevronRight size={20} color="#6b7280" />
                      ) : (
                        <ChevronDown size={20} color="#6b7280" />
                      )}
                    </Pressable>

                    {/* Actions in this Mandalart */}
                    {!isCollapsed && (
                      <View className="mt-2 space-y-2">
                        {mandalartActions.map((action) => (
                          <Pressable
                            key={action.id}
                            onPress={() => handleToggleCheck(action)}
                            disabled={
                              action.type === 'reference' ||
                              checkingActions.has(action.id)
                            }
                            className={`flex-row items-center p-4 bg-white rounded-xl border ${
                              action.is_checked
                                ? 'border-gray-200 bg-gray-50'
                                : action.type === 'reference'
                                  ? 'border-gray-100 bg-gray-50/50'
                                  : 'border-gray-200'
                            }`}
                          >
                            {/* Checkbox */}
                            <View className="mr-3">
                              {checkingActions.has(action.id) ? (
                                <ActivityIndicator size="small" color="#10b981" />
                              ) : action.is_checked ? (
                                <CheckCircle2 size={24} color="#10b981" />
                              ) : (
                                <Circle
                                  size={24}
                                  color={
                                    action.type === 'reference'
                                      ? '#d1d5db'
                                      : '#9ca3af'
                                  }
                                />
                              )}
                            </View>

                            {/* Content */}
                            <View className="flex-1">
                              <Text
                                className={`text-base ${
                                  action.is_checked
                                    ? 'text-gray-500 line-through'
                                    : 'text-gray-900'
                                }`}
                              >
                                {action.title}
                              </Text>
                              <View className="flex-row items-center mt-1">
                                <Text className="text-xs text-gray-400">
                                  {action.sub_goal.title}
                                </Text>
                              </View>
                            </View>

                            {/* Type Badge */}
                            <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-lg">
                              <ActionTypeIcon type={action.type} size={14} />
                              <Text className="text-xs text-gray-600 ml-1">
                                {formatTypeDetails(action) ||
                                  getActionTypeLabel(action.type)}
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )
              }
            )}
          </View>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
