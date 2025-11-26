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
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  RotateCw,
  Target,
  Lightbulb,
} from 'lucide-react-native'
import { format } from 'date-fns'
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

// Action type icon component
function ActionTypeIcon({
  type,
  size = 16,
}: {
  type: ActionType
  size?: number
}) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#667eea" />
    case 'mission':
      return <Target size={size} color="#f59e0b" />
    case 'reference':
      return <Lightbulb size={size} color="#6b7280" />
    default:
      return null
  }
}

export default function TodayScreen() {
  const { user } = useAuthStore()
  const [selectedDate] = useState(new Date())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  )
  const [refreshing, setRefreshing] = useState(false)
  const [checkingActions, setCheckingActions] = useState<Set<string>>(new Set())

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
        <ActivityIndicator size="large" color="#667eea" />
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
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              오늘의 실천
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {format(selectedDate, 'M월 d일 (EEEE)', { locale: ko })}
            </Text>
          </View>
        </View>

        {/* Progress Card */}
        {filteredActions.length > 0 && (
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                오늘의 달성율
              </Text>
              <Text className="text-lg font-bold text-primary">
                {progressPercentage}%
              </Text>
            </View>

            {/* Progress Bar */}
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </View>

            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-gray-500">
                {checkedCount} / {totalCount} 완료
              </Text>
              <Text className="text-xs text-gray-400">참고는 제외</Text>
            </View>
          </View>
        )}

        {/* Empty State */}
        {filteredActions.length === 0 && (
          <View className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]">
            <Text className="text-4xl mb-4">📋</Text>
            <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
              오늘 실천할 항목이 없습니다
            </Text>
            <Text className="text-gray-500 text-center">
              만다라트를 활성화하거나{'\n'}새로운 목표를 추가해보세요
            </Text>
          </View>
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
                      className="flex-row items-center justify-between p-4 bg-gray-100 rounded-2xl"
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
                                <ActivityIndicator size="small" color="#667eea" />
                              ) : action.is_checked ? (
                                <CheckCircle2 size={24} color="#667eea" />
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
