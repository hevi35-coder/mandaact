import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  LogOut,
  Bell,
  User,
  Info,
  ChevronRight,
  Shield,
  MessageCircle,
  Star,
  ExternalLink,
} from 'lucide-react-native'
import * as Application from 'expo-application'
import { useAuthStore } from '../store/authStore'
import { useUserGamification } from '../hooks/useStats'
import { APP_NAME } from '@mandaact/shared'

export default function SettingsScreen() {
  const { user, signOut, loading } = useAuthStore()
  const { data: gamification } = useUserGamification(user?.id)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const currentLevel = gamification?.current_level || 1
  const totalXP = gamification?.total_xp || 0

  const handleSignOut = useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true)
          try {
            await signOut()
          } finally {
            setIsSigningOut(false)
          }
        },
      },
    ])
  }, [signOut])

  const handleToggleNotifications = useCallback((value: boolean) => {
    setNotificationsEnabled(value)
    // TODO: Implement actual notification permission handling
    if (value) {
      Alert.alert('알림 활성화', '푸시 알림이 활성화되었습니다.')
    }
  }, [])

  const handleOpenURL = useCallback(async (url: string) => {
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
    }
  }, [])

  const handleShowAppInfo = useCallback(() => {
    const version = Application.nativeApplicationVersion || '1.0.0'
    const buildNumber = Application.nativeBuildVersion || '1'

    Alert.alert(
      '앱 정보',
      `${APP_NAME}\n\n버전: ${version} (${buildNumber})\n플랫폼: React Native + Expo\n\n© 2025 MandaAct`,
      [{ text: '확인' }]
    )
  }, [])

  const handlePrivacyPolicy = useCallback(() => {
    // TODO: Replace with actual privacy policy URL
    Alert.alert('개인정보 처리방침', '개인정보 처리방침 페이지로 이동합니다.')
  }, [])

  const handleFeedback = useCallback(() => {
    Alert.alert('피드백 보내기', '피드백을 보내시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '이메일로 보내기',
        onPress: () => handleOpenURL('mailto:support@mandaact.com?subject=MandaAct 피드백'),
      },
    ])
  }, [handleOpenURL])

  const handleRateApp = useCallback(() => {
    // TODO: Replace with actual store URLs
    Alert.alert('앱 평가하기', '스토어에서 앱을 평가해주세요!', [
      { text: '나중에', style: 'cancel' },
      {
        text: '평가하기',
        onPress: () => {
          // Linking.openURL for App Store or Play Store
        },
      },
    ])
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">설정</Text>

        {/* User Info Card */}
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row items-center">
            <View className="w-14 h-14 bg-primary/20 rounded-full items-center justify-center">
              <User size={28} color="#667eea" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {user?.email || '사용자'}
              </Text>
              <View className="flex-row items-center mt-1">
                <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-semibold text-primary">
                    Lv. {currentLevel}
                  </Text>
                </View>
                <Text className="text-sm text-gray-500 ml-2">
                  {totalXP.toLocaleString()} XP
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notification Settings */}
        <View className="bg-white rounded-2xl overflow-hidden mb-4">
          <View className="flex-row items-center px-4 py-4">
            <Bell size={20} color="#6b7280" />
            <Text className="flex-1 ml-3 text-base text-gray-900">
              푸시 알림
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#d1d5db', true: '#667eea' }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Support Section */}
        <Text className="text-sm font-semibold text-gray-500 mb-2 ml-1">
          지원
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden mb-4">
          <Pressable
            onPress={handleFeedback}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
          >
            <MessageCircle size={20} color="#6b7280" />
            <Text className="flex-1 ml-3 text-base text-gray-900">
              피드백 보내기
            </Text>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>
          <Pressable
            onPress={handleRateApp}
            className="flex-row items-center px-4 py-4"
          >
            <Star size={20} color="#6b7280" />
            <Text className="flex-1 ml-3 text-base text-gray-900">
              앱 평가하기
            </Text>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Info Section */}
        <Text className="text-sm font-semibold text-gray-500 mb-2 ml-1">
          정보
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden mb-4">
          <Pressable
            onPress={handleShowAppInfo}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
          >
            <Info size={20} color="#6b7280" />
            <Text className="flex-1 ml-3 text-base text-gray-900">앱 정보</Text>
            <Text className="text-sm text-gray-400 mr-1">
              {Application.nativeApplicationVersion || '1.0.0'}
            </Text>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>
          <Pressable
            onPress={handlePrivacyPolicy}
            className="flex-row items-center px-4 py-4"
          >
            <Shield size={20} color="#6b7280" />
            <Text className="flex-1 ml-3 text-base text-gray-900">
              개인정보 처리방침
            </Text>
            <ExternalLink size={16} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Sign Out */}
        <Pressable
          className="bg-white rounded-2xl px-4 py-4 flex-row items-center mb-8"
          onPress={handleSignOut}
          disabled={loading || isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <LogOut size={20} color="#ef4444" />
          )}
          <Text className="ml-3 text-base text-red-500 font-medium">
            로그아웃
          </Text>
        </Pressable>

        {/* Footer */}
        <View className="items-center pb-8">
          <Text className="text-xs text-gray-400">
            {APP_NAME} for Mobile
          </Text>
          <Text className="text-xs text-gray-400 mt-1">
            Made with ❤️ using React Native
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
