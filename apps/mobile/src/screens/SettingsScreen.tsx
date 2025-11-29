import React, { useState, useCallback, useEffect } from 'react'
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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
// SafeAreaView removed - Header component handles safe area
import {
  LogOut,
  Bell,
  Info,
  ChevronRight,
  Shield,
  MessageCircle,
  Star,
  ExternalLink,
  Clock,
  X,
  Check,
  HelpCircle,
  AlarmClock,
  Sparkles,
  Pencil,
} from 'lucide-react-native'
import * as Application from 'expo-application'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Header } from '../components'
import { useAuthStore } from '../store/authStore'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useUserGamification, statsKeys } from '../hooks/useStats'
import { useNotifications } from '../hooks/useNotifications'
import { APP_NAME } from '@mandaact/shared'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

// Time picker options
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const queryClient = useQueryClient()
  const { user, signOut, loading } = useAuthStore()
  const { data: gamification } = useUserGamification(user?.id)
  const {
    isEnabled: notificationsEnabled,
    isLoading: notificationLoading,
    isPermissionDenied,
    reminderEnabled,
    customMessageEnabled,
    reminderTime,
    toggleNotifications,
    toggleReminder,
    toggleCustomMessage,
    updateReminderTime,
    formatReminderTime,
  } = useNotifications()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedHour, setSelectedHour] = useState(reminderTime.hour)
  const [selectedMinute, setSelectedMinute] = useState(reminderTime.minute)

  // Nickname editing
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [isSavingNickname, setIsSavingNickname] = useState(false)
  const [nicknameError, setNicknameError] = useState('')

  const currentLevel = gamification?.current_level || 1
  const totalXP = gamification?.total_xp || 0
  const nickname = gamification?.nickname || ''

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

  const handleOpenNicknameModal = useCallback(() => {
    setNicknameInput(nickname)
    setNicknameError('')
    setShowNicknameModal(true)
  }, [nickname])

  const handleSaveNickname = useCallback(async () => {
    const trimmed = nicknameInput.trim()

    // Validation
    if (trimmed.length < 2) {
      setNicknameError('닉네임은 2자 이상이어야 합니다')
      return
    }
    if (trimmed.length > 12) {
      setNicknameError('닉네임은 12자 이하여야 합니다')
      return
    }

    setIsSavingNickname(true)
    setNicknameError('')

    try {
      const { error } = await supabase
        .from('user_levels')
        .update({ nickname: trimmed })
        .eq('user_id', user?.id)

      if (error) {
        if (error.code === '23505') {
          setNicknameError('이미 사용 중인 닉네임입니다')
        } else {
          setNicknameError('닉네임 변경 중 오류가 발생했습니다')
        }
        return
      }

      // Refetch query to refresh immediately
      await queryClient.refetchQueries({ queryKey: statsKeys.gamification(user?.id || '') })
      setShowNicknameModal(false)
    } catch {
      setNicknameError('닉네임 변경 중 오류가 발생했습니다')
    } finally {
      setIsSavingNickname(false)
    }
  }, [nicknameInput, user?.id, queryClient])

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
    <View className="flex-1 bg-gray-50">
      <Header showBackButton title="설정" />
      <ScrollView className="flex-1 px-5 pt-5">

        {/* User Info Card */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          className="bg-white rounded-3xl p-5 mb-5 border border-gray-100"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          {/* Nickname and Email row */}
          <View className="flex-row items-center">
            <Pressable
              onPress={handleOpenNicknameModal}
              className="flex-row items-center"
            >
              <Text
                className="text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {nickname || '닉네임 설정'}
              </Text>
              <Pencil size={14} color="#9ca3af" style={{ marginLeft: 4 }} />
            </Pressable>
            <Text
              className="text-sm text-gray-400 ml-2"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {user?.email}
            </Text>
          </View>

          {/* Stats row */}
          <View className="flex-row items-center mt-2">
            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
              <Text
                className="text-xs text-primary"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                Lv. {currentLevel}
              </Text>
            </View>
            <Text
              className="text-sm text-gray-500 ml-2"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {totalXP.toLocaleString()} XP
            </Text>
            {user?.created_at && (
              <>
                <Text className="text-gray-300 mx-2">·</Text>
                <Text
                  className="text-sm text-gray-500"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  함께한 지 {Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))}일째
                </Text>
              </>
            )}
          </View>
        </Animated.View>

        {/* Notification Settings */}
        <Text
          className="text-sm text-gray-500 mb-2 ml-1"
          style={{ fontFamily: 'Pretendard-SemiBold' }}
        >
          알림
        </Text>
        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          className="bg-white rounded-3xl overflow-hidden mb-5 border border-gray-100"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          {/* Master Push Notification Toggle */}
          <View className="flex-row items-center px-5 py-4 border-b border-gray-100">
            <Bell size={22} color="#6b7280" />
            <View className="flex-1 ml-3">
              <Text
                className="text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                푸시 알림
              </Text>
              {isPermissionDenied && (
                <Text
                  className="text-xs text-red-500 mt-0.5"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
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
                trackColor={{ false: '#d1d5db', true: '#18181b' }}
                thumbColor="white"
              />
            )}
          </View>

          {/* Notification Types - Always visible, disabled when master is off */}
          {/* 실천 리마인더 */}
          <View className={`px-5 pb-3 pt-2 ${!notificationsEnabled ? 'opacity-50' : ''}`}>
            <View className="flex-row items-center py-3">
              <AlarmClock size={20} color={notificationsEnabled ? '#6b7280' : '#d1d5db'} />
              <View className="flex-1 ml-3">
                <Text
                  className={`text-base ${notificationsEnabled ? 'text-gray-900' : 'text-gray-400'}`}
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  실천 리마인더
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${notificationsEnabled ? 'text-gray-500' : 'text-gray-400'}`}
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  매일 설정한 시간에 오늘 할 실천 알림
                </Text>
              </View>
              <Switch
                value={notificationsEnabled && reminderEnabled}
                onValueChange={(value) => { toggleReminder(value) }}
                trackColor={{ false: '#d1d5db', true: '#18181b' }}
                thumbColor="white"
                disabled={!notificationsEnabled || notificationLoading}
              />
            </View>

            {/* Time Setting - Only show when both master and reminder are enabled */}
            {notificationsEnabled && reminderEnabled && (
              <Pressable
                onPress={handleOpenTimePicker}
                className="flex-row items-center ml-8 py-2 pl-3 pr-2 bg-gray-50 rounded-xl"
              >
                <Clock size={16} color="#9ca3af" />
                <Text
                  className="flex-1 ml-2 text-sm text-gray-600"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  알림 시간
                </Text>
                <Text
                  className="text-sm text-primary mr-1"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {formatReminderTime()}
                </Text>
                <ChevronRight size={16} color="#9ca3af" />
              </Pressable>
            )}
          </View>

          {/* 맞춤 메시지 */}
          <View className={`px-5 pb-4 border-t border-gray-100 pt-3 ${!notificationsEnabled ? 'opacity-50' : ''}`}>
            <View className="flex-row items-center py-3">
              <Sparkles size={20} color={notificationsEnabled ? '#6b7280' : '#d1d5db'} />
              <View className="flex-1 ml-3">
                <Text
                  className={`text-base ${notificationsEnabled ? 'text-gray-900' : 'text-gray-400'}`}
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  맞춤 메시지
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${notificationsEnabled ? 'text-gray-500' : 'text-gray-400'}`}
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  주간 리포트 생성, 장기 미접속 안내 등
                </Text>
              </View>
              <Switch
                value={notificationsEnabled && customMessageEnabled}
                onValueChange={(value) => { toggleCustomMessage(value) }}
                trackColor={{ false: '#d1d5db', true: '#18181b' }}
                thumbColor="white"
                disabled={!notificationsEnabled || notificationLoading}
              />
            </View>
          </View>
        </Animated.View>

        {/* Support Section */}
        <Text
          className="text-sm text-gray-500 mb-2 ml-1"
          style={{ fontFamily: 'Pretendard-SemiBold' }}
        >
          지원
        </Text>
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          className="bg-white rounded-3xl overflow-hidden mb-5 border border-gray-100"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <Pressable
            onPress={() => navigation.navigate('Tutorial')}
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
          >
            <HelpCircle size={22} color="#6b7280" />
            <Text
              className="flex-1 ml-3 text-base text-gray-900"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              사용 가이드
            </Text>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>
          <Pressable
            onPress={handleFeedback}
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
          >
            <MessageCircle size={22} color="#6b7280" />
            <Text
              className="flex-1 ml-3 text-base text-gray-900"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              피드백 보내기
            </Text>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>
          <Pressable
            onPress={handleRateApp}
            className="flex-row items-center px-5 py-4"
          >
            <Star size={22} color="#6b7280" />
            <Text
              className="flex-1 ml-3 text-base text-gray-900"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              앱 평가하기
            </Text>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>
        </Animated.View>

        {/* Info Section */}
        <Text
          className="text-sm text-gray-500 mb-2 ml-1"
          style={{ fontFamily: 'Pretendard-SemiBold' }}
        >
          정보
        </Text>
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          className="bg-white rounded-3xl overflow-hidden mb-5 border border-gray-100"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <Pressable
            onPress={handleShowAppInfo}
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
          >
            <Info size={22} color="#6b7280" />
            <Text
              className="flex-1 ml-3 text-base text-gray-900"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              앱 정보
            </Text>
            <Text
              className="text-sm text-gray-400 mr-1"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {Application.nativeApplicationVersion || '1.0.0'}
            </Text>
            <ChevronRight size={18} color="#9ca3af" />
          </Pressable>
          <Pressable
            onPress={handlePrivacyPolicy}
            className="flex-row items-center px-5 py-4"
          >
            <Shield size={22} color="#6b7280" />
            <Text
              className="flex-1 ml-3 text-base text-gray-900"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              개인정보 처리방침
            </Text>
            <ExternalLink size={16} color="#9ca3af" />
          </Pressable>
        </Animated.View>

        {/* Sign Out */}
        <Pressable
          className="bg-white rounded-3xl px-5 py-4 flex-row items-center mb-8 border border-gray-100"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
          onPress={handleSignOut}
          disabled={loading || isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <LogOut size={22} color="#ef4444" />
          )}
          <Text
            className="ml-3 text-base text-red-500"
            style={{ fontFamily: 'Pretendard-Medium' }}
          >
            로그아웃
          </Text>
        </Pressable>

        {/* Footer */}
        <View className="items-center pb-8">
          <Text
            className="text-xs text-gray-400"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            {APP_NAME} for Mobile
          </Text>
          <Text
            className="text-xs text-gray-400 mt-1"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
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
            <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100">
              <Pressable
                onPress={() => setShowTimePicker(false)}
                className="p-2"
              >
                <X size={24} color="#6b7280" />
              </Pressable>
              <Text
                className="text-lg text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                알림 시간 설정
              </Text>
              <Pressable onPress={handleSaveTime} className="p-2">
                <Check size={24} color="#667eea" />
              </Pressable>
            </View>

            {/* Time Selection */}
            <View className="flex-row justify-center items-center py-8 px-5">
              {/* Hour Picker */}
              <View className="items-center">
                <Text
                  className="text-sm text-gray-500 mb-2"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  시
                </Text>
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
                        selectedHour === hour ? 'bg-primary/10 rounded-xl' : ''
                      }`}
                    >
                      <Text
                        className="text-2xl"
                        style={{
                          fontFamily: selectedHour === hour ? 'Pretendard-Bold' : 'Pretendard-Regular',
                          color: selectedHour === hour ? '#667eea' : '#9ca3af',
                        }}
                      >
                        {hour.toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <Text
                className="text-3xl text-gray-400 mx-4"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                :
              </Text>

              {/* Minute Picker */}
              <View className="items-center">
                <Text
                  className="text-sm text-gray-500 mb-2"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  분
                </Text>
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
                          ? 'bg-primary/10 rounded-xl'
                          : ''
                      }`}
                    >
                      <Text
                        className="text-2xl"
                        style={{
                          fontFamily: selectedMinute === minute ? 'Pretendard-Bold' : 'Pretendard-Regular',
                          color: selectedMinute === minute ? '#667eea' : '#9ca3af',
                        }}
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
              <Text
                className="text-base text-gray-600"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                매일{' '}
                <Text
                  className="text-primary"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  {formatTimeDisplay(selectedHour, selectedMinute)}
                </Text>
                에 알림
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nickname Edit Modal */}
      <Modal
        visible={showNicknameModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNicknameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl pt-4 pb-8">
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100">
                <Pressable
                  onPress={() => setShowNicknameModal(false)}
                  className="p-2"
                  disabled={isSavingNickname}
                >
                  <X size={24} color="#6b7280" />
                </Pressable>
                <Text
                  className="text-lg text-gray-900"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  닉네임 변경
                </Text>
                <Pressable
                  onPress={handleSaveNickname}
                  className="p-2"
                  disabled={isSavingNickname}
                >
                  {isSavingNickname ? (
                    <ActivityIndicator size="small" color="#667eea" />
                  ) : (
                    <Check size={24} color="#667eea" />
                  )}
                </Pressable>
              </View>

              {/* Input */}
              <View className="px-5 py-6">
                <TextInput
                  value={nicknameInput}
                  onChangeText={setNicknameInput}
                  placeholder="닉네임 입력 (2-12자)"
                  maxLength={12}
                  autoFocus
                  className="text-base text-gray-900 border border-gray-200 rounded-xl px-4 py-3"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                />
                {nicknameError ? (
                  <Text
                    className="text-sm text-red-500 mt-2 ml-1"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {nicknameError}
                  </Text>
                ) : (
                  <Text
                    className="text-xs text-gray-400 mt-2 ml-1"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    한글, 영문, 숫자 사용 가능 (2-12자)
                  </Text>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// Helper function to format time display
function formatTimeDisplay(hour: number, minute: number): string {
  const period = hour >= 12 ? '오후' : '오전'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const displayMinute = minute.toString().padStart(2, '0')
  return `${period} ${displayHour}:${displayMinute}`
}
