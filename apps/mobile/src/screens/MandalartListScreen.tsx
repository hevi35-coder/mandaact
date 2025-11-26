import React from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus } from 'lucide-react-native'

export default function MandalartListScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-900">
            만다라트 관리
          </Text>
          <Pressable className="bg-primary rounded-full p-2">
            <Plus size={24} color="white" />
          </Pressable>
        </View>

        <View className="bg-white rounded-2xl p-6 items-center justify-center min-h-[200px]">
          <Text className="text-gray-400 text-center">
            만다라트가 없습니다.{'\n'}
            새 만다라트를 생성해보세요!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
