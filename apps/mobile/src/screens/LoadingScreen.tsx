import React from 'react'
import { View, ActivityIndicator, Text } from 'react-native'

export default function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#667eea" />
      <Text className="mt-4 text-gray-500">로딩 중...</Text>
    </View>
  )
}
