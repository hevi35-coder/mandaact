import React, { useState, useCallback, useRef, useMemo } from 'react'
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
  type TextInput as TextInputType,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { X, Mail, Lock, Eye, EyeOff, Globe, ChevronDown, Check } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { changeLanguage, getCurrentLanguage, type SupportedLanguage } from '../i18n'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../components/Toast'
import { parseError, ERROR_MESSAGES } from '../lib/errorHandling'
import { trackLogin, trackSignup, identifyUser } from '../lib'

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
]

export default function LoginScreen() {
  const { t } = useTranslation()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage())
  const passwordInputRef = useRef<TextInputType>(null)

  const handleLanguageChange = useCallback(async (langCode: string) => {
    // Close dropdown first
    setShowLanguageDropdown(false)
    // Update local state immediately for UI responsiveness
    setCurrentLang(langCode as SupportedLanguage)
    // Use the centralized changeLanguage function from i18n module
    // This ensures proper AsyncStorage key (@app_language) is used
    await changeLanguage(langCode as SupportedLanguage)
  }, [])

  const currentLanguage = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0]
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

  const emailTypoSuggestion = useMemo(() => {
    const value = signUpEmail.trim().toLowerCase()
    const atIndex = value.lastIndexOf('@')
    if (atIndex <= 0) return null

    const domain = value.slice(atIndex + 1)
    const typoMap: Record<string, string> = {
      'gamil.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'hotnail.com': 'hotmail.com',
      'yaho.com': 'yahoo.com',
      'naver.con': 'naver.com',
      'hanmail.con': 'hanmail.net',
      'daum.ne': 'daum.net',
    }

    const suggested = typoMap[domain]
    if (!suggested) return null
    return { domain, suggested }
  }, [signUpEmail])

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
      const errorKeyOrMessage = parseError(error)
      const message = errorKeyOrMessage.startsWith('errors.')
        ? t(errorKeyOrMessage)
        : errorKeyOrMessage
      Alert.alert(t('common.error'), message)
    }
  }

  const performSignUp = useCallback(async () => {
    setSignUpLoading(true)
    try {
      const result = await signUp(signUpEmail.trim(), signUpPassword)

      if (result?.user) {
        trackSignup('email')
        identifyUser(result.user.id, result.user.email ? { email: result.user.email } : undefined)
      }

      setIsSignUpModalOpen(false)
      setSignUpEmail('')
      setSignUpPassword('')
      setSignUpConfirmPassword('')

      if (result?.requiresEmailConfirmation) {
        Alert.alert(
          t('login.signupComplete'),
          t('login.verificationSent'),
          [{ text: t('common.confirm') }]
        )
        return
      }

      // A안: 인증 없이 즉시 사용 → 별도 팝업 없이 토스트만 노출
      toast.success(t('login.signupComplete'))
    } catch (error) {
      const errorKeyOrMessage = parseError(error)
      const message = errorKeyOrMessage.startsWith('errors.')
        ? t(errorKeyOrMessage)
        : errorKeyOrMessage
      Alert.alert(t('common.error'), message)
    } finally {
      setSignUpLoading(false)
    }
  }, [identifyUser, signUp, signUpEmail, signUpPassword, t, toast])

  const handleSignUp = useCallback(() => {
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

    if (emailTypoSuggestion) {
      Alert.alert(
        t('signup.emailTypo.title'),
        t('signup.emailTypo.message', {
          domain: emailTypoSuggestion.domain,
          suggested: emailTypoSuggestion.suggested,
        }),
        [
          { text: t('signup.emailTypo.edit'), style: 'cancel' },
          { text: t('signup.emailTypo.continue'), onPress: () => void performSignUp() },
        ]
      )
      return
    }

    void performSignUp()
  }, [
    emailTypoSuggestion,
    performSignUp,
    signUpConfirmPassword,
    signUpEmail,
    signUpPassword,
    t,
  ])

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
      const errorKeyOrMessage = parseError(error)
      const message = errorKeyOrMessage.startsWith('errors.')
        ? t(errorKeyOrMessage)
        : errorKeyOrMessage
      Alert.alert(t('common.error'), message)
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
          onScrollBeginDrag={() => setShowLanguageDropdown(false)}
        >
          <Pressable
            className="flex-1 justify-center items-center px-6 py-8"
            onPress={() => setShowLanguageDropdown(false)}
          >
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
              {/* Header with Title and Language Selector */}
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-2xl font-bold text-black">{t('login.title')}</Text>

                {/* Language Selector */}
                <View>
                  <Pressable
                    onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="flex-row items-center bg-gray-100 rounded-full px-3 py-2"
                  >
                    <Globe size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-700 ml-1.5 mr-1" style={{ fontFamily: 'Pretendard-Medium' }}>
                      {currentLanguage.code.toUpperCase()}
                    </Text>
                    <ChevronDown size={14} color="#6b7280" />
                  </Pressable>
                </View>
              </View>

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
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    blurOnSubmit={false}
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
                    ref={passwordInputRef}
                    className="flex-1 px-3 text-gray-900"
                    style={{ fontSize: 16, includeFontPadding: false, padding: 0, margin: 0 }}
                    placeholder={t('login.passwordPlaceholder')}
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
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
          </Pressable>
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
                {emailTypoSuggestion && (
                  <Text className="text-xs text-amber-600 mt-2">
                    {t('signup.emailTypo.inlineHint', {
                      suggested: emailTypoSuggestion.suggested,
                      defaultValue: `혹시 ${emailTypoSuggestion.suggested}을(를) 의미하셨나요?`,
                    })}
                  </Text>
                )}
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

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageDropdown(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/30"
          onPress={() => setShowLanguageDropdown(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              minWidth: 200,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-100">
              <Text className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                {t('settings.app.language')}
              </Text>
            </View>

            {/* Language Options */}
            {LANGUAGES.map((lang, index) => (
              <Pressable
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#f3f4f6' : lang.code === currentLang ? 'rgba(37, 99, 235, 0.05)' : 'white',
                })}
                className={`flex-row items-center justify-between px-4 py-3.5 ${
                  index < LANGUAGES.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <Text
                  className={`text-base ${lang.code === currentLang ? 'text-primary' : 'text-gray-700'}`}
                  style={{ fontFamily: lang.code === currentLang ? 'Pretendard-SemiBold' : 'Pretendard-Regular' }}
                >
                  {lang.label}
                </Text>
                {lang.code === currentLang && (
                  <Check size={18} color="#2563eb" />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}
