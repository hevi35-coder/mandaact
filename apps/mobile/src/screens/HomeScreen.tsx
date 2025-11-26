import React from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../store/authStore'
import { APP_NAME } from '@mandaact/shared'

export default function HomeScreen() {
  const { user } = useAuthStore()

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
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-3xl font-bold text-primary">0</Text>
              <Text className="text-sm text-gray-500">완료</Text>
            </View>
            <View className="items-center">
              <Text className="text-3xl font-bold text-gray-400">0</Text>
              <Text className="text-sm text-gray-500">남음</Text>
            </View>
            <View className="items-center">
              <Text className="text-3xl font-bold text-green-500">0%</Text>
              <Text className="text-sm text-gray-500">달성률</Text>
            </View>
          </View>
        </View>

        {/* Level Card */}
        <View className="bg-gradient-to-r from-primary to-accent rounded-2xl p-6 mb-4">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white/80 text-sm">현재 레벨</Text>
              <Text className="text-white text-3xl font-bold">Lv. 1</Text>
            </View>
            <View className="items-end">
              <Text className="text-white/80 text-sm">XP</Text>
              <Text className="text-white text-xl font-semibold">0 / 100</Text>
            </View>
          </View>
          {/* XP Progress Bar */}
          <View className="h-2 bg-white/30 rounded-full mt-4">
            <View className="h-full bg-white rounded-full w-0" />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            빠른 실행
          </Text>
          <View className="flex-row space-x-3">
            <Pressable className="flex-1 bg-primary/10 rounded-xl py-4 items-center">
              <Text className="text-primary font-semibold">오늘의 실천</Text>
            </Pressable>
            <Pressable className="flex-1 bg-gray-100 rounded-xl py-4 items-center">
              <Text className="text-gray-700 font-semibold">새 만다라트</Text>
            </Pressable>
          </View>
        </View>

        {/* App Info */}
        <View className="items-center py-4">
          <Text className="text-gray-400 text-xs">
            {APP_NAME} - React Native 버전
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
