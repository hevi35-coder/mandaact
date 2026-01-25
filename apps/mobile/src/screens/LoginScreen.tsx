import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
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
 * FINAL HIGH-CONTRAST BUTTONS (V14)
 * Uses standard "Apple Black" and "Google White" styles for maximum visibility.
 * Switched to TouchableOpacity for reliable native rendering.
 */
interface SocialButtonProps {
  onPress: () => void
  icon: React.ReactNode
  label: string
  variant: 'apple' | 'google'
}

function SocialLoginButton({ onPress, icon, label, variant }: SocialButtonProps) {
  const isApple = variant === 'apple'

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.btnBase,
        isApple ? styles.btnApple : styles.btnGoogle
      ]}
    >
      <View style={styles.btnContent}>
        <View style={styles.btnIconBox}>
          {icon}
        </View>
        <Text
          style={[styles.btnLabel, isApple ? styles.textWhite : styles.textDark]}
          allowFontScaling={false}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
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
    <SafeAreaView style={styles.root}>
      {/* Absolute Language Picker */}
      <View style={styles.absHeader}>
        <TouchableOpacity
          onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
          activeOpacity={0.7}
          style={styles.langChip}
        >
          <Globe size={13} color="#475569" />
          <Text style={styles.langChipText}>
            {currentLanguage.code.toUpperCase()}
          </Text>
          <ChevronDown size={11} color="#94a3b8" />
        </TouchableOpacity>

        {showLanguageDropdown && (
          <View style={styles.langMenu}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                style={[
                  styles.langOption,
                  currentLang === lang.code && styles.langOptionActive
                ]}
              >
                <Text style={[
                  styles.langOptionText,
                  currentLang === lang.code && styles.langOptionTextActive
                ]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Branding Body */}
        <View style={styles.brandingBody}>
          <View style={styles.logoStack}>
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

          <View style={styles.heroImgBox}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.heroImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Action Sector: High Visibility Buttons */}
        <View style={styles.actionSector}>
          <View style={styles.btnStack}>
            <View style={{ marginBottom: 16 }}>
              <SocialLoginButton
                variant="apple"
                onPress={handleAppleLogin}
                label={t('login.continueWithApple')}
                icon={<AppleIcon color="#FFFFFF" width={19} height={21} />}
              />
            </View>

            <View style={{ marginBottom: 28 }}>
              <SocialLoginButton
                variant="google"
                onPress={handleGoogleLogin}
                label={t('login.continueWithGoogle')}
                icon={<GoogleIcon width={18} height={18} />}
              />
            </View>
          </View>

          <View style={styles.footerLegal}>
            <Text
              style={styles.footerLegalText}
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
  root: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 120, // INCREASED: Optical Center Strategy
    alignItems: 'center'
  },
  // TOP NAV
  absHeader: {
    position: 'absolute',
    top: 60, // Increased status bar clearance
    right: 24,
    zIndex: 1000
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2
  },
  langChipText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'Pretendard-Bold',
    marginLeft: 6,
    marginRight: 4
  },
  langMenu: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
    minWidth: 130,
    overflow: 'hidden'
  },
  langOption: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  langOptionActive: {
    backgroundColor: '#f1f5f9'
  },
  langOptionText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Pretendard-Medium'
  },
  langOptionTextActive: {
    color: '#2563eb',
    fontFamily: 'Pretendard-Bold'
  },
  // BRANDING
  brandingBody: {
    alignItems: 'center',
    marginTop: 0, // Removed top margin to rely purely on padding
    marginBottom: 80, // INCREASED: Separation between ID and Action
    width: '100%'
  },
  logoStack: {
    alignItems: 'center',
    marginBottom: 56, // INCREASED: Grandeur for text
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  logoManda: {
    fontSize: 50,
    fontFamily: 'Pretendard-Bold',
    color: '#111827',
    letterSpacing: -2.5
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
    letterSpacing: -0.8
  },
  heroImgBox: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  heroImg: {
    width: 104,
    height: 104,
    borderRadius: 26
  },
  // HIGH CONTRAST BUTTONS
  actionSector: {
    width: '100%',
    maxWidth: 345,
    alignItems: 'center'
  },
  btnStack: {
    width: '100%'
  },
  btnBase: {
    width: '100%',
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  btnApple: {
    backgroundColor: '#000000', // Solid Black
    borderWidth: 0
  },
  btnGoogle: {
    backgroundColor: '#ffffff', // Solid White
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },
  btnIconBox: {
    marginRight: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnLabel: {
    fontSize: 17,
    fontFamily: 'Pretendard-Bold',
    textAlign: 'center',
    letterSpacing: -0.4,
    includeFontPadding: false,
    lineHeight: 22
  },
  textWhite: {
    color: '#ffffff'
  },
  textDark: {
    color: '#1e293b'
  },
  footerLegal: {
    marginTop: 24, // Detached slightly
    paddingHorizontal: 4
  },
  footerLegalText: {
    fontSize: 10.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 14,
    fontFamily: 'Pretendard-Medium'
  }
})
