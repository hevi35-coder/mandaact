import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { Globe, ChevronDown } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { changeLanguage, getCurrentLanguage, type SupportedLanguage } from '../i18n'
import { AppleIcon } from '../components/icons/AppleIcon'
import { GoogleIcon } from '../components/icons/GoogleIcon'

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
]

/**
 * SOPHISTICATED PERFECTION BUTTON (V10)
 * Expert Note: Sophisticated 1.0px borders with Gray-200. 
 * Decoupled rendering for absolute stability.
 */
interface SocialButtonProps {
  onPress?: () => void
  icon: React.ReactNode
  label: string
}

function SocialLoginButton({ onPress, icon, label }: SocialButtonProps) {
  return (
    <View style={styles.sophisticatedWrapper}>
      {/* Visual Layer: Ultra-Refined for Premium Feel */}
      <View style={styles.visualBox}>
        <View style={styles.buttonContentRow}>
          <View style={styles.iconCenterWrap}>
            {icon}
          </View>
          <Text style={styles.labelPremiumText} allowFontScaling={false}>
            {label}
          </Text>
        </View>
      </View>

      {/* Interaction Layer */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.touchLayer,
          pressed && styles.touchLayerPressed
        ]}
      />
    </View>
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

  return (
    <SafeAreaView style={styles.safeRoot}>
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* Localization Trigger */}
        <View style={styles.topNavRow}>
          <Pressable
            onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
            style={styles.langSelectorChip}
          >
            <Globe size={13} color="#475569" />
            <Text style={styles.langSelectorChipText}>
              {currentLanguage.code.toUpperCase()}
            </Text>
            <ChevronDown size={11} color="#94a3b8" />
          </Pressable>

          {showLanguageDropdown && (
            <View style={styles.langDropMenu}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageChange(lang.code)}
                  style={[
                    styles.langOptItem,
                    currentLang === lang.code && styles.langOptItemActive
                  ]}
                >
                  <Text style={[
                    styles.langOptItemText,
                    currentLang === lang.code && styles.langOptItemTextActive
                  ]}>
                    {lang.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Hero Branding Section (Fixed Axial Alignment) */}
        <View style={styles.heroLayout}>
          <View style={styles.brandingCenterGroup}>
            {/* Logo Group: Mathematically Calibrated Centering */}
            <View style={styles.logoRootCenter}>
              <Text style={styles.mandaTextBold}>Manda</Text>
              <MaskedView
                style={styles.actMaskFixedSize}
                maskElement={<Text style={styles.actTextBold}>Act</Text>}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.actTextBold, { opacity: 0 }]}>Act</Text>
                </LinearGradient>
              </MaskedView>
            </View>

            <Text style={styles.subtitlePremiumText}>
              {currentLang === 'ko' ? '목표를 실천으로' : 'Turn Goals into Action'}
            </Text>
          </View>

          <View style={styles.appIconVisualHalo}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.heroAppLogoImg}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Action Sector: REFINED SPACING & SOPHISTICATED WEIGHT */}
        <View style={styles.actionSectorGroup}>
          <View style={styles.buttonStackGroup}>
            <View style={{ marginBottom: 16 }}>
              <SocialLoginButton
                label={t('login.continueWithApple')}
                icon={<AppleIcon color="#111827" width={19} height={21} />}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <SocialLoginButton
                label={t('login.continueWithGoogle')}
                icon={<GoogleIcon width={21} height={21} />}
              />
            </View>
          </View>

          {/* Legal Footer: Optimized for Single Line */}
          <View style={styles.footerLegalZone}>
            <Text
              style={styles.legalNoticeTinyText}
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
  safeRoot: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollBody: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  // I18N
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    zIndex: 100
  },
  langSelectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  langSelectorChipText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
    marginRight: 4,
    fontFamily: 'Pretendard-Bold'
  },
  langDropMenu: {
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
  langOptItem: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc'
  },
  langOptItemActive: {
    backgroundColor: '#f1f5f9'
  },
  langOptItemText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Pretendard-Medium'
  },
  langOptItemTextActive: {
    color: '#2563eb',
    fontFamily: 'Pretendard-Bold'
  },
  // HERO & BRANDING (AXIAL ALIGNMENT CORRECTED)
  heroLayout: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40
  },
  brandingCenterGroup: {
    alignItems: 'center',
    marginBottom: 44,
    width: '100%'
  },
  logoRootCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%'
  },
  mandaTextBold: {
    fontSize: 50,
    fontFamily: 'Pretendard-Bold',
    color: '#111827',
    letterSpacing: -2.5, // Slightly tighter to pull center
  },
  actMaskFixedSize: {
    width: 76,  // CALIBRATED: Reduced from 85/90 to perfectly frame 'Act'
    height: 64,
    marginLeft: 0
  },
  actTextBold: {
    fontSize: 50,
    fontFamily: 'Pretendard-Bold',
    letterSpacing: -2,
    lineHeight: 64
  },
  subtitlePremiumText: {
    color: '#1e293b',
    fontSize: 20,
    fontFamily: 'Pretendard-Bold',
    letterSpacing: -0.8,
    textAlign: 'center'
  },
  appIconVisualHalo: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  heroAppLogoImg: {
    width: 104,
    height: 104,
    borderRadius: 26
  },
  // SOPHISTICATED PERFECTION BUTTONS
  actionSectorGroup: {
    width: '100%',
    maxWidth: 345,
    alignSelf: 'center',
  },
  buttonStackGroup: {
    marginTop: 0
  },
  sophisticatedWrapper: {
    width: '100%',
    height: 58, // Tighter premium height
    position: 'relative'
  },
  visualBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fcfdfe', // Slightly purer fill
    borderWidth: 1.0, // ULTRA-SOPHISTICATED WEIGHT
    borderColor: '#e2e8f0', // SOFT GRAY-200
    borderRadius: 18,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  iconCenterWrap: {
    marginRight: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  labelPremiumText: {
    fontSize: 17, // Subtly refined font size
    fontFamily: 'Pretendard-Bold',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: -0.4,
    includeFontPadding: false,
    lineHeight: 22
  },
  touchLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    zIndex: 10
  },
  touchLayerPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  },
  footerLegalZone: {
    paddingHorizontal: 4, // MINIMIZED for single line fit
    marginTop: 20, // Tightened from Google button
    paddingBottom: 40
  },
  legalNoticeTinyText: {
    fontSize: 10.5, // Slightly smaller to guarantee 1-line
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 14,
    fontFamily: 'Pretendard-Medium'
  }
})
