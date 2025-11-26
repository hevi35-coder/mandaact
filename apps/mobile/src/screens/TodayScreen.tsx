import React from 'react'
import { View, Text, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function TodayScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          오늘의 실천
        </Text>

        <View className="bg-white rounded-2xl p-6 items-center justify-center min-h-[200px]">
          <Text className="text-gray-400 text-center">
            아직 활성화된 만다라트가 없습니다.{'\n'}
            새 만다라트를 생성해주세요.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
