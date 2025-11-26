import React, { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import { CalendarCheck, Grid3X3, TrendingUp, FileText, Award, HelpCircle, Settings, Flame, Target } from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'
import { useDailyStats, useUserGamification, useHeatmapData } from '../hooks/useStats'
import { useActiveMandalarts } from '../hooks/useMandalarts'
import { APP_NAME } from '@mandaact/shared'
import ActivityHeatmap from '../components/ActivityHeatmap'
import type { RootStackParamList, MainTabParamList } from '../navigation/RootNavigator'

// XP calculation helpers (simplified version)
function calculateXPForLevel(level: number): number {
  if (level <= 0) return 0
  if (level === 1) return 100
  if (level === 2) return 200
  // Hybrid log curve for higher levels
  const baseXP = 100
  const scaleFactor = 1.8
  return Math.floor(baseXP * Math.pow(level, scaleFactor))
}

function getXPForCurrentLevel(totalXP: number, level: number): { current: number; required: number } {
  const xpForCurrentLevel = calculateXPForLevel(level)
  const xpForNextLevel = calculateXPForLevel(level + 1)
  const xpProgress = totalXP - xpForCurrentLevel
  const xpRequired = xpForNextLevel - xpForCurrentLevel
  return {
    current: Math.max(0, xpProgress),
    required: xpRequired,
  }
}

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Data fetching
  const { data: dailyStats, isLoading: statsLoading } = useDailyStats(user?.id)
  const { data: gamification, isLoading: gamificationLoading } = useUserGamification(user?.id)
  const { data: mandalarts, isLoading: mandalartLoading } = useActiveMandalarts(user?.id)
  const { data: heatmapData = [], isLoading: heatmapLoading } = useHeatmapData(user?.id, selectedMonth)

  const isLoading = statsLoading || gamificationLoading || mandalartLoading

  // Calculate XP progress
  const currentLevel = gamification?.current_level || 1
  const totalXP = gamification?.total_xp || 0
  const { current: xpProgress, required: xpRequired } = getXPForCurrentLevel(totalXP, currentLevel)
  const xpPercentage = xpRequired > 0 ? Math.round((xpProgress / xpRequired) * 100) : 0

  // Stats
  const todayChecked = dailyStats?.checked || 0
  const todayTotal = dailyStats?.total || 0
  const todayRemaining = Math.max(0, todayTotal - todayChecked)
  const completionPercentage = dailyStats?.percentage || 0
  const currentStreak = gamification?.current_streak || 0
  const longestStreak = gamification?.longest_streak || 0

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header - match web style with settings icon */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <Text className="text-3xl font-bold text-gray-900">홈</Text>
            <Text className="text-gray-500 ml-3 text-sm">성장 대시보드</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            className="p-2 rounded-full active:bg-gray-100"
          >
            <Settings size={24} color="#6b7280" />
          </Pressable>
        </View>

        {/* Quick Stats Card */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            오늘의 진행상황
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#374151" />
          ) : (
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-3xl font-bold text-primary">{todayChecked}</Text>
                <Text className="text-sm text-gray-500">완료</Text>
              </View>
              <View className="items-center">
                <Text className="text-3xl font-bold text-gray-400">{todayRemaining}</Text>
                <Text className="text-sm text-gray-500">남음</Text>
              </View>
              <View className="items-center">
                <Text className="text-3xl font-bold text-green-500">{completionPercentage}%</Text>
                <Text className="text-sm text-gray-500">달성률</Text>
              </View>
            </View>
          )}
        </View>

        {/* Level Card - white theme to match web */}
        <View className="bg-white rounded-2xl p-6 mb-4 border border-gray-200 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-gray-500 text-sm">현재 레벨</Text>
              <Text className="text-gray-900 text-3xl font-bold">Lv. {currentLevel}</Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-500 text-sm">XP</Text>
              <Text className="text-gray-900 text-xl font-semibold">
                {xpProgress} / {xpRequired}
              </Text>
            </View>
          </View>
          {/* XP Progress Bar */}
          <View className="h-3 bg-gray-200 rounded-full mt-4 overflow-hidden">
            <View
              className="h-full bg-gray-900 rounded-full"
              style={{ width: `${xpPercentage}%` }}
            />
          </View>
        </View>

        {/* Streak Cards */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-200">
            <View className="flex-row items-center mb-2">
              <Flame size={16} color="#f59e0b" />
              <Text className="text-sm text-gray-500 ml-1">현재 스트릭</Text>
            </View>
            <Text className="text-2xl font-bold text-amber-500">
              {currentStreak}일
            </Text>
          </View>

          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-200">
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

        {/* Active Mandalarts Summary */}
        {mandalarts && mandalarts.length > 0 && (
          <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-900">
                활성 만다라트
              </Text>
              <Text className="text-sm text-primary">{mandalarts.length}개</Text>
            </View>
            {mandalarts.slice(0, 3).map((mandalart, index) => (
              <View
                key={mandalart.id}
                className={`py-3 ${index < Math.min(2, mandalarts.length - 1) ? 'border-b border-gray-100' : ''}`}
              >
                <Text className="text-base font-medium text-gray-900" numberOfLines={1}>
                  {mandalart.title}
                </Text>
                <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
                  {mandalart.center_goal}
                </Text>
              </View>
            ))}
            {mandalarts.length > 3 && (
              <Text className="text-sm text-gray-400 mt-2 text-center">
                +{mandalarts.length - 3}개 더 보기
              </Text>
            )}
          </View>
        )}

        {/* Quick Actions - outline style to match web */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            빠른 실행
          </Text>
          <View className="flex-row gap-3 mb-3">
            <Pressable
              className="flex-1 bg-gray-900 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Today')}
            >
              <CalendarCheck size={18} color="#ffffff" />
              <Text className="text-white font-semibold ml-2">오늘의 실천</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-white border border-gray-300 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Mandalart')}
            >
              <Grid3X3 size={18} color="#374151" />
              <Text className="text-gray-700 font-semibold ml-2">만다라트 관리</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 bg-white border border-gray-300 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Reports')}
            >
              <FileText size={18} color="#8b5cf6" />
              <Text className="text-gray-700 font-semibold ml-2">AI 리포트</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-white border border-gray-300 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Badges')}
            >
              <Award size={18} color="#f59e0b" />
              <Text className="text-gray-700 font-semibold ml-2">뱃지</Text>
            </Pressable>
          </View>
        </View>

        {/* Tutorial Banner - outline style to match web */}
        <View>
          <Pressable
            className="bg-white border border-gray-300 rounded-2xl p-4 mb-4 flex-row items-center"
            onPress={() => navigation.navigate('Tutorial')}
          >
          <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center">
            <HelpCircle size={20} color="#3b82f6" />
          </View>
            <View className="flex-1 ml-3">
              <Text className="text-gray-900 font-semibold">튜토리얼</Text>
              <Text className="text-gray-500 text-sm">사용법 다시 보기</Text>
            </View>
          </Pressable>
        </View>

        {/* App Info */}
        <View className="items-center py-4">
          <Text className="text-gray-400 text-xs">
            {APP_NAME} - React Native 버전
          </Text>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
