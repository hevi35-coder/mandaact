import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  TrendingUp,
  Calendar,
  Target,
  Award,
  Flame,
  ChevronRight,
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { useAuthStore } from '../store/authStore'
import {
  useDailyStats,
  useWeeklyStats,
  useUserGamification,
  useHeatmapData,
  useSubGoalProgress,
} from '../hooks/useStats'
import ActivityHeatmap from '../components/ActivityHeatmap'
import type { MainTabParamList } from '../navigation/RootNavigator'

type NavigationProp = BottomTabNavigationProp<MainTabParamList>

// XP calculation (simplified version)
function calculateXPForLevel(level: number): number {
  if (level <= 0) return 0
  if (level === 1) return 100
  if (level === 2) return 200
  const baseXP = 100
  const scaleFactor = 1.8
  return Math.floor(baseXP * Math.pow(level, scaleFactor))
}

function getXPProgress(totalXP: number, level: number): { current: number; required: number; percentage: number } {
  const xpForCurrentLevel = calculateXPForLevel(level)
  const xpForNextLevel = calculateXPForLevel(level + 1)
  const xpProgress = totalXP - xpForCurrentLevel
  const xpRequired = xpForNextLevel - xpForCurrentLevel
  const percentage = xpRequired > 0 ? Math.round((xpProgress / xpRequired) * 100) : 0
  return {
    current: Math.max(0, xpProgress),
    required: xpRequired,
    percentage: Math.min(100, percentage),
  }
}

export default function StatsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Data fetching
  const { data: dailyStats, refetch: refetchDaily, isLoading: dailyLoading } = useDailyStats(user?.id)
  const { data: weeklyStats, refetch: refetchWeekly, isLoading: weeklyLoading } = useWeeklyStats(user?.id)
  const { data: gamification, refetch: refetchGamification } = useUserGamification(user?.id)
  const { data: heatmapData = [], isLoading: heatmapLoading } = useHeatmapData(user?.id, selectedMonth)
  const { data: subGoalProgress = [], isLoading: progressLoading } = useSubGoalProgress(user?.id)

  const isLoading = dailyLoading || weeklyLoading

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      refetchDaily(),
      refetchWeekly(),
      refetchGamification(),
    ])
    setRefreshing(false)
  }, [refetchDaily, refetchWeekly, refetchGamification])

  // Gamification data
  const currentLevel = gamification?.current_level || 1
  const totalXP = gamification?.total_xp || 0
  const currentStreak = gamification?.current_streak || 0
  const longestStreak = gamification?.longest_streak || 0
  const xpProgress = getXPProgress(totalXP, currentLevel)

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text className="text-2xl font-bold text-gray-900 mb-4">통계</Text>

        {/* Loading state */}
        {isLoading && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#667eea" />
          </View>
        )}

        {!isLoading && (
          <>
            {/* Today & Week Summary */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-white rounded-2xl p-4">
                <View className="flex-row items-center mb-2">
                  <Calendar size={16} color="#667eea" />
                  <Text className="text-sm text-gray-500 ml-1">오늘</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {dailyStats?.percentage || 0}%
                </Text>
                <Text className="text-xs text-gray-400">
                  {dailyStats?.checked || 0}/{dailyStats?.total || 0} 완료
                </Text>
              </View>

              <View className="flex-1 bg-white rounded-2xl p-4">
                <View className="flex-row items-center mb-2">
                  <TrendingUp size={16} color="#22c55e" />
                  <Text className="text-sm text-gray-500 ml-1">이번 주</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-900">
                  {weeklyStats?.percentage || 0}%
                </Text>
                <Text className="text-xs text-gray-400">
                  {weeklyStats?.checked || 0}/{weeklyStats?.total || 0} 완료
                </Text>
              </View>
            </View>

            {/* Level & XP Card */}
            <View className="bg-primary rounded-2xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Award size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    레벨 {currentLevel}
                  </Text>
                </View>
                <Text className="text-white/80 text-sm">
                  {totalXP.toLocaleString()} XP
                </Text>
              </View>

              {/* XP Progress Bar */}
              <View className="h-2 bg-white/30 rounded-full overflow-hidden mb-2">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: `${xpProgress.percentage}%` }}
                />
              </View>

              <Text className="text-white/70 text-xs text-right">
                다음 레벨까지 {xpProgress.required - xpProgress.current} XP
              </Text>
            </View>

            {/* Streak Cards */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-white rounded-2xl p-4">
                <View className="flex-row items-center mb-2">
                  <Flame size={16} color="#f59e0b" />
                  <Text className="text-sm text-gray-500 ml-1">현재 스트릭</Text>
                </View>
                <Text className="text-2xl font-bold text-amber-500">
                  {currentStreak}일
                </Text>
              </View>

              <View className="flex-1 bg-white rounded-2xl p-4">
                <View className="flex-row items-center mb-2">
                  <Target size={16} color="#ef4444" />
                  <Text className="text-sm text-gray-500 ml-1">최장 스트릭</Text>
                </View>
                <Text className="text-2xl font-bold text-red-500">
                  {longestStreak}일
                </Text>
              </View>
            </View>

            {/* Activity Heatmap */}
            <View className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                활동 히트맵
              </Text>
              <ActivityHeatmap
                data={heatmapData}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                isLoading={heatmapLoading}
              />
            </View>

            {/* Sub-goal Progress */}
            <View className="mb-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                세부 목표 진행률
              </Text>

              {progressLoading ? (
                <View className="bg-white rounded-2xl p-6 items-center">
                  <ActivityIndicator size="small" color="#667eea" />
                </View>
              ) : subGoalProgress.length === 0 ? (
                <View className="bg-white rounded-2xl p-6 items-center">
                  <Text className="text-gray-400 text-center">
                    활성화된 만다라트가 없습니다.
                  </Text>
                </View>
              ) : (
                <View className="bg-white rounded-2xl overflow-hidden">
                  {subGoalProgress.slice(0, 5).map((item, index) => (
                    <View
                      key={item.id}
                      className={`p-4 ${
                        index < subGoalProgress.length - 1 && index < 4
                          ? 'border-b border-gray-100'
                          : ''
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-1">
                          <Text
                            className="text-sm font-medium text-gray-900"
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text className="text-xs text-gray-400">
                            {item.mandalartTitle}
                          </Text>
                        </View>
                        <Text
                          className={`text-sm font-semibold ${
                            item.completionRate >= 80
                              ? 'text-green-500'
                              : item.completionRate >= 50
                                ? 'text-amber-500'
                                : 'text-gray-500'
                          }`}
                        >
                          {item.completionRate}%
                        </Text>
                      </View>

                      {/* Progress bar */}
                      <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${
                            item.completionRate >= 80
                              ? 'bg-green-500'
                              : item.completionRate >= 50
                                ? 'bg-amber-500'
                                : 'bg-gray-400'
                          }`}
                          style={{ width: `${item.completionRate}%` }}
                        />
                      </View>

                      <Text className="text-xs text-gray-400 mt-1">
                        {item.completedToday}/{item.totalActions} 완료
                      </Text>
                    </View>
                  ))}

                  {subGoalProgress.length > 5 && (
                    <Pressable
                      className="p-4 flex-row items-center justify-center border-t border-gray-100"
                      onPress={() => navigation.navigate('Mandalart')}
                    >
                      <Text className="text-sm text-primary">
                        더 보기 ({subGoalProgress.length - 5}개 더)
                      </Text>
                      <ChevronRight size={16} color="#667eea" />
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {/* Bottom spacing */}
            <View className="h-8" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
