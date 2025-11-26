import React from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { CalendarCheck, Grid3X3, TrendingUp } from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'
import { useDailyStats, useUserGamification } from '../hooks/useStats'
import { useActiveMandalarts } from '../hooks/useMandalarts'
import { APP_NAME } from '@mandaact/shared'

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

type RootTabParamList = {
  Home: undefined
  Today: undefined
  Mandalart: undefined
  Stats: undefined
  Settings: undefined
}

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>()
  const { user } = useAuthStore()

  // Data fetching
  const { data: dailyStats, isLoading: statsLoading } = useDailyStats(user?.id)
  const { data: gamification, isLoading: gamificationLoading } = useUserGamification(user?.id)
  const { data: mandalarts, isLoading: mandalartLoading } = useActiveMandalarts(user?.id)

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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            안녕하세요! 👋
          </Text>
          <Text className="text-gray-500 mt-1">
            오늘도 목표를 향해 한 걸음 나아가세요
          </Text>
        </View>

        {/* Quick Stats Card */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            오늘의 진행상황
          </Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#667eea" />
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

        {/* Level Card */}
        <View className="bg-primary rounded-2xl p-6 mb-4">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white/80 text-sm">현재 레벨</Text>
              <Text className="text-white text-3xl font-bold">Lv. {currentLevel}</Text>
            </View>
            <View className="items-end">
              <Text className="text-white/80 text-sm">XP</Text>
              <Text className="text-white text-xl font-semibold">
                {xpProgress} / {xpRequired}
              </Text>
            </View>
          </View>
          {/* XP Progress Bar */}
          <View className="h-2 bg-white/30 rounded-full mt-4 overflow-hidden">
            <View
              className="h-full bg-white rounded-full"
              style={{ width: `${xpPercentage}%` }}
            />
          </View>
          {/* Streak */}
          {currentStreak > 0 && (
            <View className="flex-row items-center mt-3">
              <TrendingUp size={16} color="white" />
              <Text className="text-white/90 text-sm ml-2">
                🔥 {currentStreak}일 연속 실천 중!
              </Text>
            </View>
          )}
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

        {/* Quick Actions */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            빠른 실행
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 bg-primary/10 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Today')}
            >
              <CalendarCheck size={18} color="#667eea" />
              <Text className="text-primary font-semibold ml-2">오늘의 실천</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-gray-100 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Mandalart')}
            >
              <Grid3X3 size={18} color="#4b5563" />
              <Text className="text-gray-700 font-semibold ml-2">만다라트 관리</Text>
            </Pressable>
          </View>
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
