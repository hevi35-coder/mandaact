import React from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LogOut, Bell, User, Info } from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'

export default function SettingsScreen() {
  const { user, signOut, loading } = useAuthStore()

  const handleSignOut = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          설정
        </Text>

        {/* User Info */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center">
              <User size={24} color="#667eea" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {user?.email || '사용자'}
              </Text>
              <Text className="text-sm text-gray-500">
                Lv. 1 · 0 XP
              </Text>
            </View>
          </View>
        </View>

        {/* Settings List */}
        <View className="bg-white rounded-2xl overflow-hidden mb-4">
          <Pressable className="flex-row items-center px-4 py-4 border-b border-gray-100">
            <Bell size={20} color="#6b7280" />
            <Text className="flex-1 ml-3 text-base text-gray-900">알림 설정</Text>
          </Pressable>
          <Pressable className="flex-row items-center px-4 py-4">
            <Info size={20} color="#6b7280" />
            <Text className="flex-1 ml-3 text-base text-gray-900">앱 정보</Text>
          </Pressable>
        </View>

        {/* Sign Out */}
        <Pressable
          className="bg-white rounded-2xl px-4 py-4 flex-row items-center"
          onPress={handleSignOut}
          disabled={loading}
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="ml-3 text-base text-red-500 font-medium">
            로그아웃
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
