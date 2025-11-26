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
  Modal,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInUp } from 'react-native-reanimated'
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
  Clock,
  X,
  Check,
} from 'lucide-react-native'
import * as Application from 'expo-application'
import { useAuthStore } from '../store/authStore'
import { useUserGamification } from '../hooks/useStats'
import { useNotifications } from '../hooks/useNotifications'
import { APP_NAME } from '@mandaact/shared'

// Time picker options
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

export default function SettingsScreen() {
  const { user, signOut, loading } = useAuthStore()
  const { data: gamification } = useUserGamification(user?.id)
  const {
    isEnabled: notificationsEnabled,
    isLoading: notificationLoading,
    isPermissionDenied,
    reminderTime,
    toggleNotifications,
    updateReminderTime,
    formatReminderTime,
  } = useNotifications()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedHour, setSelectedHour] = useState(reminderTime.hour)
  const [selectedMinute, setSelectedMinute] = useState(reminderTime.minute)

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

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    const success = await toggleNotifications(value)

    if (!success && value) {
      Alert.alert(
        '알림 권한 필요',
        '푸시 알림을 사용하려면 설정에서 알림 권한을 허용해주세요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '설정으로 이동',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:')
              } else {
                Linking.openSettings()
              }
            },
          },
        ]
      )
    }
  }, [toggleNotifications])

  const handleOpenTimePicker = useCallback(() => {
    setSelectedHour(reminderTime.hour)
    setSelectedMinute(reminderTime.minute)
    setShowTimePicker(true)
  }, [reminderTime])

  const handleSaveTime = useCallback(async () => {
    await updateReminderTime(selectedHour, selectedMinute)
    setShowTimePicker(false)
    Alert.alert('알림 시간 설정', `매일 ${formatTimeDisplay(selectedHour, selectedMinute)}에 알림을 보내드립니다.`)
  }, [selectedHour, selectedMinute, updateReminderTime])

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
    handleOpenURL('https://mandaact.com/privacy')
  }, [handleOpenURL])

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
    Alert.alert('앱 평가하기', '스토어에서 앱을 평가해주세요!', [
      { text: '나중에', style: 'cancel' },
      {
        text: '평가하기',
        onPress: () => {
          // Platform-specific store URLs
          const storeUrl = Platform.select({
            ios: 'https://apps.apple.com/app/mandaact/id000000000',
            android: 'https://play.google.com/store/apps/details?id=com.mandaact',
          })
          if (storeUrl) handleOpenURL(storeUrl)
        },
      },
    ])
  }, [handleOpenURL])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">설정</Text>

        {/* User Info Card */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} className="bg-white rounded-2xl p-4 mb-4">
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
        </Animated.View>

        {/* Notification Settings */}
        <Text className="text-sm font-semibold text-gray-500 mb-2 ml-1">
          알림
        </Text>
        <Animated.View entering={FadeInUp.delay(200).duration(400)} className="bg-white rounded-2xl overflow-hidden mb-4">
          <View className="flex-row items-center px-4 py-4 border-b border-gray-100">
            <Bell size={20} color="#6b7280" />
            <View className="flex-1 ml-3">
              <Text className="text-base text-gray-900">푸시 알림</Text>
              {isPermissionDenied && (
                <Text className="text-xs text-red-500 mt-0.5">
                  설정에서 알림 권한을 허용해주세요
                </Text>
              )}
            </View>
            {notificationLoading ? (
              <ActivityIndicator size="small" color="#667eea" />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#d1d5db', true: '#667eea' }}
                thumbColor="white"
              />
            )}
          </View>

          {notificationsEnabled && (
            <Pressable
              onPress={handleOpenTimePicker}
              className="flex-row items-center px-4 py-4"
            >
              <Clock size={20} color="#6b7280" />
              <View className="flex-1 ml-3">
                <Text className="text-base text-gray-900">알림 시간</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  매일 이 시간에 알림을 보내드려요
                </Text>
              </View>
              <Text className="text-base font-medium text-primary mr-1">
                {formatReminderTime()}
              </Text>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
          )}
        </Animated.View>

        {/* Support Section */}
        <Text className="text-sm font-semibold text-gray-500 mb-2 ml-1">
          지원
        </Text>
        <Animated.View entering={FadeInUp.delay(300).duration(400)} className="bg-white rounded-2xl overflow-hidden mb-4">
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
        </Animated.View>

        {/* Info Section */}
        <Text className="text-sm font-semibold text-gray-500 mb-2 ml-1">
          정보
        </Text>
        <Animated.View entering={FadeInUp.delay(400).duration(400)} className="bg-white rounded-2xl overflow-hidden mb-4">
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
        </Animated.View>

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

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl pt-4 pb-8">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pb-4 border-b border-gray-100">
              <Pressable
                onPress={() => setShowTimePicker(false)}
                className="p-2"
              >
                <X size={24} color="#6b7280" />
              </Pressable>
              <Text className="text-lg font-semibold text-gray-900">
                알림 시간 설정
              </Text>
              <Pressable onPress={handleSaveTime} className="p-2">
                <Check size={24} color="#667eea" />
              </Pressable>
            </View>

            {/* Time Selection */}
            <View className="flex-row justify-center items-center py-8 px-4">
              {/* Hour Picker */}
              <View className="items-center">
                <Text className="text-sm text-gray-500 mb-2">시</Text>
                <ScrollView
                  className="h-40"
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                >
                  {HOURS.map((hour) => (
                    <Pressable
                      key={hour}
                      onPress={() => setSelectedHour(hour)}
                      className={`py-2 px-6 ${
                        selectedHour === hour ? 'bg-primary/10 rounded-lg' : ''
                      }`}
                    >
                      <Text
                        className={`text-2xl ${
                          selectedHour === hour
                            ? 'font-bold text-primary'
                            : 'text-gray-400'
                        }`}
                      >
                        {hour.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <Text className="text-3xl text-gray-400 mx-4">:</Text>

              {/* Minute Picker */}
              <View className="items-center">
                <Text className="text-sm text-gray-500 mb-2">분</Text>
                <ScrollView
                  className="h-40"
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                >
                  {MINUTES.map((minute) => (
                    <Pressable
                      key={minute}
                      onPress={() => setSelectedMinute(minute)}
                      className={`py-2 px-6 ${
                        selectedMinute === minute
                          ? 'bg-primary/10 rounded-lg'
                          : ''
                      }`}
                    >
                      <Text
                        className={`text-2xl ${
                          selectedMinute === minute
                            ? 'font-bold text-primary'
                            : 'text-gray-400'
                        }`}
                      >
                        {minute.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Preview */}
            <View className="items-center pb-4">
              <Text className="text-base text-gray-600">
                매일{' '}
                <Text className="font-semibold text-primary">
                  {formatTimeDisplay(selectedHour, selectedMinute)}
                </Text>
                에 알림
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// Helper function to format time display
function formatTimeDisplay(hour: number, minute: number): string {
  const period = hour >= 12 ? '오후' : '오전'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const displayMinute = minute.toString().padStart(2, '0')
  return `${period} ${displayHour}:${displayMinute}`
}
