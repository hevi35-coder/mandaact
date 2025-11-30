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
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { parseError, ERROR_MESSAGES } from '../lib/errorHandling'
import { trackLogin, trackSignup, identifyUser } from '../lib'

export default function LoginScreen() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [_confirmPassword, _setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [_showConfirmPassword, _setShowConfirmPassword] = useState(false)
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('')
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false)
  const [signUpLoading, setSignUpLoading] = useState(false)
  const { signIn, signUp, resetPassword, loading } = useAuthStore()

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert(t('login.inputError'), t('login.enterEmail'))
      return
    }
    if (!password) {
      Alert.alert(t('login.inputError'), t('login.enterPassword'))
      return
    }

    try {
      const result = await signIn(email.trim(), password)
      // Track login event and identify user
      if (result?.user) {
        trackLogin('email')
        identifyUser(result.user.id, result.user.email ? { email: result.user.email } : undefined)
      }
    } catch (error) {
      const errorMessage = parseError(error)
      Alert.alert(t('common.error'), errorMessage)
    }
  }

  const handleSignUp = async () => {
    if (!signUpEmail.trim()) {
      Alert.alert(t('login.inputError'), t('login.enterEmail'))
      return
    }
    if (!signUpPassword) {
      Alert.alert(t('login.inputError'), t('login.enterPassword'))
      return
    }
    if (signUpPassword.length < 6) {
      Alert.alert(t('login.inputError'), t('signup.errors.weakPassword'))
      return
    }
    if (signUpPassword !== signUpConfirmPassword) {
      Alert.alert(t('login.inputError'), t('signup.errors.passwordMismatch'))
      return
    }

    setSignUpLoading(true)
    try {
      const result = await signUp(signUpEmail.trim(), signUpPassword)
      // Track signup event
      if (result?.user) {
        trackSignup('email')
        identifyUser(result.user.id, result.user.email ? { email: result.user.email } : undefined)
      }
      setIsSignUpModalOpen(false)
      setSignUpEmail('')
      setSignUpPassword('')
      setSignUpConfirmPassword('')
      Alert.alert(
        t('login.signupComplete'),
        t('login.verificationSent'),
        [{ text: t('common.confirm') }]
      )
    } catch (error) {
      const errorMessage = parseError(error)
      Alert.alert(t('common.error'), errorMessage)
    } finally {
      setSignUpLoading(false)
    }
  }

  const handleResetPassword = useCallback(async () => {
    if (!resetEmail.trim()) {
      Alert.alert(t('login.inputError'), t('login.enterEmail'))
      return
    }

    setIsResetting(true)
    try {
      await resetPassword(resetEmail.trim())
      setShowResetModal(false)
      setResetEmail('')
      Alert.alert(
        t('login.emailSent'),
        t('login.resetLinkSent'),
        [{ text: t('common.confirm') }]
      )
    } catch (error) {
      const errorMessage = parseError(error)
      Alert.alert(t('common.error'), errorMessage)
    } finally {
      setIsResetting(false)
    }
  }, [resetEmail, resetPassword, t])

  const openResetModal = useCallback(() => {
    setResetEmail(email)
    setShowResetModal(true)
  }, [email])

  const openSignUpModal = useCallback(() => {
    setSignUpEmail(email)
    setIsSignUpModalOpen(true)
  }, [email])

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center items-center px-6 py-8">
            {/* Content Container - max width for tablet */}
            <View style={{ width: '100%', maxWidth: 400 }}>
            {/* Logo/Header */}
            <View className="items-center mb-10">
              <View className="flex-row items-center">
                <Text style={{ fontSize: 48, fontFamily: 'Pretendard-Bold', color: '#000' }}>Manda</Text>
                <MaskedView
                  maskElement={
                    <Text style={{ fontSize: 48, fontFamily: 'Pretendard-Bold' }}>Act</Text>
                  }
                >
                  <LinearGradient
                    colors={['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={{ fontSize: 48, fontFamily: 'Pretendard-Bold', opacity: 0 }}>Act</Text>
                  </LinearGradient>
                </MaskedView>
              </View>
              <Text className="text-gray-500 mt-3 text-base">
                {t('login.subtitle')}
              </Text>
            </View>

            {/* Login Card */}
            <View className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
              <Text className="text-2xl font-bold text-black mb-6">{t('login.title')}</Text>

              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">{t('login.email')}</Text>
                <View
                  className="flex-row items-center border border-gray-300 rounded-lg px-3"
                  style={{ height: 48 }}
                >
                  <Mail size={18} color="#9ca3af" />
                  <TextInput
                    className="flex-1 px-3 text-gray-900"
                    style={{ fontSize: 16, includeFontPadding: false, padding: 0, margin: 0 }}
                    placeholder={t('login.emailPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 mb-2">{t('login.password')}</Text>
                <View
                  className="flex-row items-center border border-gray-300 rounded-lg px-3"
                  style={{ height: 48 }}
                >
                  <Lock size={18} color="#9ca3af" />
                  <TextInput
                    className="flex-1 px-3 text-gray-900"
                    style={{ fontSize: 16, includeFontPadding: false, padding: 0, margin: 0 }}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                    {showPassword ? (
                      <EyeOff size={18} color="#9ca3af" />
                    ) : (
                      <Eye size={18} color="#9ca3af" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Forgot Password */}
              <Pressable onPress={openResetModal} className="self-end mb-4">
                <Text className="text-sm text-primary">{t('login.forgotPassword')}</Text>
              </Pressable>

              {/* Login Button - White background with gradient border and text */}
              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 2, borderRadius: 12 }}
                >
                  <View
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 10,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaskedView
                      maskElement={
                        <Text style={{ fontSize: 16, fontFamily: 'Pretendard-SemiBold' }}>
                          {loading ? t('login.loggingIn') : t('login.loginButton')}
                        </Text>
                      }
                    >
                      <LinearGradient
                        colors={['#2563eb', '#9333ea', '#db2777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={{ fontSize: 16, fontFamily: 'Pretendard-SemiBold', opacity: 0 }}>
                          {loading ? t('login.loggingIn') : t('login.loginButton')}
                        </Text>
                      </LinearGradient>
                    </MaskedView>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Sign Up Link */}
              <View className="border-t border-gray-200 mt-5 pt-4">
                <View className="flex-row justify-center items-center">
                  <Text className="text-gray-600 text-sm">{t('login.noAccount')} </Text>
                  <Pressable onPress={openSignUpModal}>
                    <MaskedView
                      maskElement={
                        <Text className="text-sm font-semibold">{t('login.signUp')}</Text>
                      }
                    >
                      <LinearGradient
                        colors={['#2563eb', '#9333ea', '#db2777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text className="text-sm font-semibold opacity-0">{t('login.signUp')}</Text>
                      </LinearGradient>
                    </MaskedView>
                  </Pressable>
                </View>
              </View>
            </View>
            </View>{/* End Content Container */}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sign Up Modal */}
      <Modal
        visible={isSignUpModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSignUpModalOpen(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-black">{t('signup.title')}</Text>
              <Pressable
                onPress={() => setIsSignUpModalOpen(false)}
                className="p-1"
              >
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            {/* Content */}
            <View className="p-4">
              {/* Email */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">{t('signup.email')}</Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg px-3">
                  <Mail size={18} color="#9ca3af" />
                  <TextInput
                    className="flex-1 py-3 px-3 text-base text-gray-900"
                    placeholder={t('signup.emailPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={signUpEmail}
                    onChangeText={setSignUpEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">{t('signup.password')}</Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg px-3">
                  <Lock size={18} color="#9ca3af" />
                  <TextInput
                    className="flex-1 py-3 px-3 text-base text-gray-900"
                    placeholder={t('signup.passwordPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={signUpPassword}
                    onChangeText={setSignUpPassword}
                    secureTextEntry={!showSignUpPassword}
                  />
                  <Pressable onPress={() => setShowSignUpPassword(!showSignUpPassword)} className="p-1">
                    {showSignUpPassword ? (
                      <EyeOff size={18} color="#9ca3af" />
                    ) : (
                      <Eye size={18} color="#9ca3af" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">{t('signup.confirmPassword')}</Text>
                <View className="flex-row items-center border border-gray-300 rounded-lg px-3">
                  <Lock size={18} color="#9ca3af" />
                  <TextInput
                    className="flex-1 py-3 px-3 text-base text-gray-900"
                    placeholder={t('signup.confirmPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={signUpConfirmPassword}
                    onChangeText={setSignUpConfirmPassword}
                    secureTextEntry={!showSignUpConfirmPassword}
                  />
                  <Pressable onPress={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)} className="p-1">
                    {showSignUpConfirmPassword ? (
                      <EyeOff size={18} color="#9ca3af" />
                    ) : (
                      <Eye size={18} color="#9ca3af" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Sign Up Button - White background with gradient border and text */}
              <Pressable
                onPress={handleSignUp}
                disabled={signUpLoading}
                style={{ opacity: signUpLoading ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 2, borderRadius: 12 }}
                >
                  <View
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 10,
                      height: 52,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {signUpLoading ? (
                      <ActivityIndicator color="#9333ea" size="small" />
                    ) : (
                      <MaskedView
                        maskElement={
                          <Text style={{ fontSize: 16, fontFamily: 'Pretendard-SemiBold' }}>
                            {t('signup.signUpButton')}
                          </Text>
                        }
                      >
                        <LinearGradient
                          colors={['#2563eb', '#9333ea', '#db2777']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={{ fontSize: 16, fontFamily: 'Pretendard-SemiBold', opacity: 0 }}>
                            {t('signup.signUpButton')}
                          </Text>
                        </LinearGradient>
                      </MaskedView>
                    )}
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
                {t('resetPassword.title')}
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
                  <Mail size={32} color="#2563eb" />
                </View>
                <Text className="text-sm text-gray-600 text-center">
                  {t('resetPassword.description')}
                </Text>
              </View>

              <View className="flex-row items-center border border-gray-300 rounded-lg px-3 mb-4">
                <Mail size={18} color="#9ca3af" />
                <TextInput
                  className="flex-1 py-3 px-3 text-base text-gray-900"
                  placeholder={t('resetPassword.emailPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {/* Reset Password Button - White background with gradient border and text */}
              <Pressable
                onPress={handleResetPassword}
                disabled={isResetting}
                style={{ opacity: isResetting ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 2, borderRadius: 12 }}
                >
                  <View
                    style={{
                      backgroundColor: 'white',
                      borderRadius: 10,
                      height: 52,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isResetting ? (
                      <ActivityIndicator color="#9333ea" size="small" />
                    ) : (
                      <MaskedView
                        maskElement={
                          <Text style={{ fontSize: 16, fontFamily: 'Pretendard-SemiBold' }}>
                            {t('resetPassword.sendButton')}
                          </Text>
                        }
                      >
                        <LinearGradient
                          colors={['#2563eb', '#9333ea', '#db2777']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text style={{ fontSize: 16, fontFamily: 'Pretendard-SemiBold', opacity: 0 }}>
                            {t('resetPassword.sendButton')}
                          </Text>
                        </LinearGradient>
                      </MaskedView>
                    )}
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
