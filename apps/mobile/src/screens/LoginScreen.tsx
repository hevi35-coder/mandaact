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
 * FINAL STABLE SOCIAL BUTTON (V13)
 * Expert Note: Single-layer Pressable for 100% reliability.
 * Guaranteeing height and width for visibility across all engines.
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
        styles.btnRoot,
        pressed && styles.btnPressed
      ]}
    >
      <View style={styles.btnContent} pointerEvents="none">
        <View style={styles.btnIconCenterer}>
          {icon}
        </View>
        <Text style={styles.btnLabelText} allowFontScaling={false}>
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
    <SafeAreaView style={styles.rootSafe}>

      {/* Absolute Language Picker (Does not disrupt vertical spacing) */}
      <View style={styles.absoluteHeader}>
        <Pressable
          onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
          style={styles.langChip}
        >
          <Globe size={13} color="#475569" />
          <Text style={styles.langChipText}>
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
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Branding Cluster: Centered with Explicit Top Margin */}
        <View style={styles.brandingBody}>
          <View style={styles.logoCenteredGroup}>
            <View style={styles.logoAxialRow}>
              <Text style={styles.textManda}>Manda</Text>
              <MaskedView
                style={styles.maskActContainer}
                maskElement={<Text style={styles.textAct}>Act</Text>}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.textAct, { opacity: 0 }]}>Act</Text>
                </LinearGradient>
              </MaskedView>
            </View>

            <Text style={styles.textLogoSubtitle}>
              {currentLang === 'ko' ? '목표를 실천으로' : 'Turn Goals into Action'}
            </Text>
          </View>

          <View style={styles.iconHaloWrapper}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.imgHeroIcon}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Action Sector: Explicit Gap from Branding for Guaranteed Visibility */}
        <View style={styles.actionSector}>
          <View style={styles.btnColumn}>
            <View style={{ marginBottom: 16 }}>
              <SocialLoginButton
                onPress={handleAppleLogin}
                label={t('login.continueWithApple')}
                icon={<AppleIcon color="#111827" width={19} height={21} />}
              />
            </View>

            <View style={{ marginBottom: 28 }}>
              <SocialLoginButton
                onPress={handleGoogleLogin}
                label={t('login.continueWithGoogle')}
                icon={<GoogleIcon width={18} height={18} />}
              />
            </View>
          </View>

          {/* Legal Footer */}
          <View style={styles.legalZone}>
            <Text
              style={styles.legalTextTiny}
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
  rootSafe: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollBody: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center', // Centers the entire Branding + Actions cluster
  },
  // TOP NAV (ABSOLUTE)
  absoluteHeader: {
    position: 'absolute',
    top: 50, // Below StatusBar
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
    marginLeft: 6,
    marginRight: 4,
    fontFamily: 'Pretendard-Bold'
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
  // BRANDING AREA
  brandingBody: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 60 // Space between 'M' and buttons
  },
  logoCenteredGroup: {
    alignItems: 'center',
    marginBottom: 44,
    width: '100%'
  },
  logoAxialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  textManda: {
    fontSize: 50,
    fontFamily: 'Pretendard-Bold',
    color: '#111827',
    letterSpacing: -2.5
  },
  maskActContainer: {
    width: 76,
    height: 64,
  },
  textAct: {
    fontSize: 50,
    fontFamily: 'Pretendard-Bold',
    letterSpacing: -2,
    lineHeight: 64
  },
  textLogoSubtitle: {
    color: '#1e293b',
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    letterSpacing: -0.8
  },
  iconHaloWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  imgHeroIcon: {
    width: 104,
    height: 104,
    borderRadius: 26
  },
  // ACTION AREA (GUARANTEED VISIBILITY)
  actionSector: {
    width: '100%',
    maxWidth: 345,
    alignSelf: 'center'
  },
  btnColumn: {
    width: '100%'
  },
  btnRoot: {
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
  btnPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },
  btnIconCenterer: {
    marginRight: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnLabelText: {
    fontSize: 17,
    fontFamily: 'Pretendard-Bold',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: -0.4,
    includeFontPadding: false,
    lineHeight: 22
  },
  legalZone: {
    marginTop: 10,
    paddingHorizontal: 4
  },
  legalTextTiny: {
    fontSize: 10.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 14,
    fontFamily: 'Pretendard-Medium'
  }
})
