import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../store/authStore'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const { signIn, signUp, loading } = useAuthStore()

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 입력해주세요.')
      return
    }

    try {
      if (isSignUp) {
        await signUp(email, password)
        Alert.alert('성공', '회원가입이 완료되었습니다. 이메일을 확인해주세요.')
      } else {
        await signIn(email, password)
      }
    } catch (error: any) {
      Alert.alert('오류', error.message || '로그인에 실패했습니다.')
    }
  }

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
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

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
    </SafeAreaView>
  )
}
