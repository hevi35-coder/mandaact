import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { Globe, ChevronDown } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { changeLanguage, getCurrentLanguage, type SupportedLanguage } from '../i18n'
import { AppleIcon } from '../components/icons/AppleIcon'
import { GoogleIcon } from '../components/icons/GoogleIcon'
import { useAuthStore } from '../store/authStore'
import { trackLogin, identifyUser } from '../lib'

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
]

/**
 * FINAL STABLE SOCIAL BUTTON (V12)
 * Pure Pressable container for 100% touch capture and visual stability.
 */
interface SocialButtonProps {
  onPress?: () => void
  icon: React.ReactNode
  label: string
}

function SocialLoginButton({ onPress, icon, label }: SocialButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonContainer,
        pressed && styles.buttonPressed
      ]}
    >
      <View style={styles.buttonContentRow} pointerEvents="none">
        <View style={styles.iconBox}>
          {icon}
        </View>
        <Text style={styles.buttonLabel} allowFontScaling={false}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

export default function LoginScreen() {
  const { t } = useTranslation()
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage())
  const currentLanguage = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0]

  const handleLanguageChange = useCallback(async (langCode: string) => {
    setShowLanguageDropdown(false)
    setCurrentLang(langCode as SupportedLanguage)
    await changeLanguage(langCode as SupportedLanguage)
  }, [])

  const { signInWithGoogle, signInWithApple } = useAuthStore()

  const handleGoogleLogin = useCallback(async () => {
    try {
      const result = await signInWithGoogle()
      if (result.user) {
        trackLogin('google')
        identifyUser(result.user.id, { email: result.user.email })
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), t('login.googleLoginFailed'))
    }
  }, [signInWithGoogle, t])

  const handleAppleLogin = useCallback(async () => {
    try {
      const result = await signInWithApple()
      if (result.user) {
        trackLogin('apple')
        identifyUser(result.user.id, { email: result.user.email })
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), t('login.appleLoginFailed'))
    }
  }, [signInWithApple, t])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Navbar */}
        <View style={styles.header}>
          <Pressable
            onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
            style={styles.langPicker}
          >
            <Globe size={13} color="#475569" />
            <Text style={styles.langText}>
              {currentLanguage.code.toUpperCase()}
            </Text>
            <ChevronDown size={11} color="#94a3b8" />
          </Pressable>

          {showLanguageDropdown && (
            <View style={styles.langMenu}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={[
                    styles.langItem,
                    currentLang === lang.code && styles.langItemActive
                  ]}
                >
                  <Text style={[
                    styles.langItemText,
                    currentLang === lang.code && styles.langItemTextActive
                  ]}>
                    {lang.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Branding Area (Fixed Heights for Stability) */}
        <View style={styles.branding}>
          <View style={styles.logoGroup}>
            <View style={styles.logoRow}>
              <Text style={styles.logoManda}>Manda</Text>
              <MaskedView
                style={styles.logoActMask}
                maskElement={<Text style={styles.logoAct}>Act</Text>}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.logoAct, { opacity: 0 }]}>Act</Text>
                </LinearGradient>
              </MaskedView>
            </View>

            <Text style={styles.logoSubtitle}>
              {currentLang === 'ko' ? '목표를 실천으로' : 'Turn Goals into Action'}
            </Text>
          </View>

          <View style={styles.appIconContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Action Area */}
        <View style={styles.actions}>
          <View style={styles.buttonStack}>
            <View style={{ marginBottom: 16 }}>
              <SocialLoginButton
                onPress={handleAppleLogin}
                label={t('login.continueWithApple')}
                icon={<AppleIcon color="#111827" width={19} height={21} />}
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <SocialLoginButton
                onPress={handleGoogleLogin}
                label={t('login.continueWithGoogle')}
                icon={<GoogleIcon width={18} height={18} />}
              />
            </View>
          </View>

          {/* Legal Bar */}
          <View style={styles.footer}>
            <Text
              style={styles.legalText}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {t('login.termsPolicy')}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    zIndex: 100
  },
  langPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  langText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
    marginRight: 4,
    fontFamily: 'Pretendard-Bold'
  },
  langMenu: {
    position: 'absolute',
    top: 54,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
    minWidth: 135,
    overflow: 'hidden'
  },
  langItem: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  langItemActive: {
    backgroundColor: '#f1f5f9'
  },
  langItemText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Pretendard-Medium'
  },
  langItemTextActive: {
    color: '#2563eb',
    fontFamily: 'Pretendard-Bold'
  },
  // BRANDING
  branding: {
    alignItems: 'center',
    marginTop: 60, // Fixed margin instead of flex: 1
    marginBottom: 60
  },
  logoGroup: {
    alignItems: 'center',
    marginBottom: 44,
    width: '100%'
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%'
  },
  logoManda: {
    fontSize: 50,
    fontFamily: 'Pretendard-Bold',
    color: '#111827',
    letterSpacing: -2.5,
  },
  logoActMask: {
    width: 76,
    height: 64,
  },
  logoAct: {
    fontSize: 50,
    fontFamily: 'Pretendard-Bold',
    letterSpacing: -2,
    lineHeight: 64
  },
  logoSubtitle: {
    color: '#1e293b',
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    letterSpacing: -0.8,
    textAlign: 'center'
  },
  appIconContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  appIcon: {
    width: 104,
    height: 104,
    borderRadius: 26
  },
  // BUTTONS
  actions: {
    width: '100%',
    maxWidth: 345,
    alignSelf: 'center',
    marginTop: 'auto', // Pushes actions to the bottom of the visible area if content is small
    marginBottom: 20
  },
  buttonStack: {
    width: '100%'
  },
  buttonContainer: {
    width: '100%',
    height: 58,
    backgroundColor: '#fcfdfe',
    borderWidth: 1.0,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1
  },
  buttonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    width: '100%',
    height: '100%'
  },
  iconBox: {
    marginRight: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonLabel: {
    fontSize: 17,
    fontFamily: 'Pretendard-Bold',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: -0.4,
    includeFontPadding: false,
    lineHeight: 22
  },
  footer: {
    marginTop: 20,
    paddingHorizontal: 4
  },
  legalText: {
    fontSize: 10.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 14,
    fontFamily: 'Pretendard-Medium'
  }
})
