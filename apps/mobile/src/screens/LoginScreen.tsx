import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, Mail } from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'
import { parseError, ERROR_MESSAGES } from '../lib/errorHandling'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const { signIn, signUp, resetPassword, loading } = useAuthStore()

  const handleSubmit = async () => {
    // Validate inputs
    if (!email.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.')
      return
    }
    if (!password) {
      Alert.alert('입력 오류', '비밀번호를 입력해주세요.')
      return
    }
    if (password.length < 6) {
      Alert.alert('입력 오류', ERROR_MESSAGES.WEAK_PASSWORD)
      return
    }

    try {
      if (isSignUp) {
        await signUp(email.trim(), password)
        Alert.alert(
          '회원가입 완료',
          '인증 이메일을 발송했습니다. 메일함을 확인해주세요.',
          [{ text: '확인' }]
        )
      } else {
        await signIn(email.trim(), password)
      }
    } catch (error) {
      const errorMessage = parseError(error)
      Alert.alert('오류', errorMessage)
    }
  }

  const handleResetPassword = useCallback(async () => {
    if (!resetEmail.trim()) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.')
      return
    }

    setIsResetting(true)
    try {
      await resetPassword(resetEmail.trim())
      setShowResetModal(false)
      setResetEmail('')
      Alert.alert(
        '이메일 발송 완료',
        '비밀번호 재설정 링크를 이메일로 보내드렸습니다. 메일함을 확인해주세요.',
        [{ text: '확인' }]
      )
    } catch (error) {
      const errorMessage = parseError(error)
      Alert.alert('오류', errorMessage)
    } finally {
      setIsResetting(false)
    }
  }, [resetEmail, resetPassword])

  const openResetModal = useCallback(() => {
    setResetEmail(email) // Pre-fill with login email if available
    setShowResetModal(true)
  }, [email])

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6">
          {/* Logo/Header */}
          <View className="items-center mb-12">
            <Text className="text-4xl font-bold text-primary">MandaAct</Text>
            <Text className="text-gray-500 mt-2">목표를 행동으로</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">이메일</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="이메일을 입력하세요"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">비밀번호</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Forgot Password - only show for login */}
            {!isSignUp && (
              <Pressable onPress={openResetModal} className="self-end">
                <Text className="text-sm text-primary">비밀번호를 잊으셨나요?</Text>
              </Pressable>
            )}

            <Pressable
              className={`bg-primary rounded-lg py-4 mt-4 ${loading ? 'opacity-50' : ''}`}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text className="text-white text-center font-semibold text-base">
                {loading ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
              </Text>
            </Pressable>
          </View>

          {/* Toggle Sign Up / Sign In */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">
              {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
            </Text>
            <Pressable onPress={() => setIsSignUp(!isSignUp)}>
              <Text className="text-primary font-semibold ml-2">
                {isSignUp ? '로그인' : '회원가입'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">
                비밀번호 재설정
              </Text>
              <Pressable
                onPress={() => setShowResetModal(false)}
                className="p-1"
              >
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            {/* Content */}
            <View className="p-4">
              <View className="items-center mb-4">
                <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-3">
                  <Mail size={32} color="#667eea" />
                </View>
                <Text className="text-sm text-gray-600 text-center">
                  가입하신 이메일 주소를 입력해주세요.{'\n'}
                  비밀번호 재설정 링크를 보내드립니다.
                </Text>
              </View>

              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base mb-4"
                placeholder="이메일을 입력하세요"
                placeholderTextColor="#9ca3af"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />

              <Pressable
                className={`bg-primary rounded-lg py-3 ${isResetting ? 'opacity-50' : ''}`}
                onPress={handleResetPassword}
                disabled={isResetting}
              >
                {isResetting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white text-center font-semibold">
                    재설정 링크 보내기
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
