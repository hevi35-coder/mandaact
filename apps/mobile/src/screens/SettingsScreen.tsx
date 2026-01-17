import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useTranslation } from 'react-i18next'
// SafeAreaView removed - Header component handles safe area
import {
  LogOut,
  Bell,
  Info,
  ChevronRight,
  Shield,
  SlidersHorizontal,
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
  Globe,
  Play,
  Crown,
  Trash2,
} from 'lucide-react-native'
import * as Application from 'expo-application'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } from 'react-native-google-mobile-ads'
import { Header } from '../components'
import { Toggle } from '../components/ui/Toggle'
import { useAuthStore } from '../store/authStore'
import { useCoachingStore } from '../store/coachingStore'
import { useSubscriptionContext } from '../context'
import { useAdFree, useRewardedAd } from '../hooks'
import { useToast } from '../components/Toast'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useUserGamification, setCachedGamificationNickname, statsKeys } from '../hooks/useStats'
import { useNotifications } from '../hooks/useNotifications'
import { useUserProfile, getDeviceTimezone } from '../hooks/useUserProfile'
import { APP_NAME } from '@mandaact/shared'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays } from 'date-fns'
import { changeLanguage, getCurrentLanguage, supportedLanguages, type SupportedLanguage } from '../i18n'

// Common timezone options for selection
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Seoul', label: '서울 (KST)', labelEn: 'Seoul (KST)', offset: '+9:00' },
  { value: 'Asia/Tokyo', label: '도쿄 (JST)', labelEn: 'Tokyo (JST)', offset: '+9:00' },
  { value: 'Asia/Shanghai', label: '상하이 (CST)', labelEn: 'Shanghai (CST)', offset: '+8:00' },
  { value: 'Asia/Singapore', label: '싱가포르 (SGT)', labelEn: 'Singapore (SGT)', offset: '+8:00' },
  { value: 'Asia/Bangkok', label: '방콕 (ICT)', labelEn: 'Bangkok (ICT)', offset: '+7:00' },
  { value: 'Asia/Kolkata', label: '인도 (IST)', labelEn: 'India (IST)', offset: '+5:30' },
  { value: 'Europe/London', label: '런던 (GMT)', labelEn: 'London (GMT)', offset: '+0:00' },
  { value: 'Europe/Paris', label: '파리 (CET)', labelEn: 'Paris (CET)', offset: '+1:00' },
  { value: 'Europe/Berlin', label: '베를린 (CET)', labelEn: 'Berlin (CET)', offset: '+1:00' },
  { value: 'America/New_York', label: '뉴욕 (EST)', labelEn: 'New York (EST)', offset: '-5:00' },
  { value: 'America/Los_Angeles', label: 'LA (PST)', labelEn: 'Los Angeles (PST)', offset: '-8:00' },
  { value: 'America/Chicago', label: '시카고 (CST)', labelEn: 'Chicago (CST)', offset: '-6:00' },
  { value: 'Pacific/Auckland', label: '오클랜드 (NZST)', labelEn: 'Auckland (NZST)', offset: '+12:00' },
  { value: 'Australia/Sydney', label: '시드니 (AEST)', labelEn: 'Sydney (AEST)', offset: '+10:00' },
]

// Time picker options
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 15, 30, 45]

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const { user, signOut, loading } = useAuthStore()
  const { isPremium, subscriptionInfo } = useSubscriptionContext()
  const { data: gamification } = useUserGamification(user?.id)

  // Log premium status changes for debugging
  useEffect(() => {
    console.log('[SettingsScreen] 🔄 Premium status update:', {
      isPremium,
      status: subscriptionInfo?.status,
      plan: subscriptionInfo?.plan,
      expiresAt: subscriptionInfo?.expiresAt,
    })
  }, [isPremium])
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isDeletingCoachingData, setIsDeletingCoachingData] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedHour, setSelectedHour] = useState(reminderTime.hour)
  const [selectedMinute, setSelectedMinute] = useState(reminderTime.minute)

  // Nickname editing
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [isSavingNickname, setIsSavingNickname] = useState(false)
  const [nicknameError, setNicknameError] = useState('')

  // Language selection
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(getCurrentLanguage())

  // Timezone selection
  const { timezone, updateTimezone } = useUserProfile(user?.id)
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)
  const [isSavingTimezone, setIsSavingTimezone] = useState(false)

  // Ad-free focus mode
  const toast = useToast()
  const { isAdFree, remainingTimeFormatted, isLoading: isAdFreeLoading, activate } = useAdFree()
  const { resetSession } = useCoachingStore()
  const [isActivatingFocus, setIsActivatingFocus] = useState(false)

  const { isLoading: isAdLoading, show: showAd } = useRewardedAd({
    adType: 'REWARDED_XP_BOOST',
    onRewardEarned: async () => {
      try {
        setIsActivatingFocus(true)
        await activate()
        toast.success(
          t('ads.adFree.activated'),
          t('ads.adFree.activatedDesc')
        )
      } catch (error) {
        console.error('[SettingsScreen] Failed to activate focus mode:', error)
        toast.error(t('common.error'), t('ads.adFree.error'))
      } finally {
        setIsActivatingFocus(false)
      }
    },
    onError: (error) => {
      console.error('[SettingsScreen] Ad error:', error)
    },
  })

  const handleFocusModePress = useCallback(async () => {
    if (isAdFree) {
      // Already active, show info
      toast.info(
        t('ads.adFree.alreadyActive'),
        t('ads.adFree.remaining', { time: remainingTimeFormatted })
      )
      return
    }
    await showAd()
  }, [isAdFree, remainingTimeFormatted, showAd, toast, t])

  const currentLevel = gamification?.current_level || 1
  const totalXP = gamification?.total_xp || 0
  const nickname = gamification?.nickname || ''

  const handleSignOut = useCallback(() => {
    Alert.alert(t('settings.account.logout'), t('settings.account.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.account.logout'),
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
  }, [signOut, t])

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t('settings.account.deleteAccount'),
      t('settings.account.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.account.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true)
            try {
              // Call RPC function to delete user account
              // All related data will be cascade deleted automatically
              const { data, error } = await supabase.rpc('delete_user_account')

              if (error) {
                console.error('[SettingsScreen] RPC error:', error)
                throw new Error(error.message || 'Failed to delete account')
              }

              // Check result from RPC function
              if (data && !data.success) {
                console.error('[SettingsScreen] Delete failed:', data.error)
                throw new Error(data.error || 'Failed to delete account')
              }

              console.log('[SettingsScreen] Account deleted successfully')

              // Sign out after deletion
              await signOut()

              Alert.alert(t('common.success'), t('settings.account.deleteSuccess'))
            } catch (error) {
              console.error('[SettingsScreen] Delete account error:', error)
              Alert.alert(
                t('common.error'),
                error instanceof Error ? error.message : t('settings.account.deleteError')
              )
            } finally {
              setIsDeletingAccount(false)
            }
          },
        },
      ]
    )
  }, [signOut, t])

  const handleDeleteCoachingData = useCallback(() => {
    if (!user?.id) return

    Alert.alert(
      t('settings.privacy.deleteCoachingData'),
      t('settings.privacy.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.privacy.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            setIsDeletingCoachingData(true)
            try {
              const { error } = await supabase
                .from('coaching_sessions')
                .delete()
                .eq('user_id', user.id)

              if (error) throw error

              resetSession()
              toast.success(t('common.success'), t('settings.privacy.deleteSuccess'))
            } catch (error) {
              console.error('[SettingsScreen] Delete coaching error:', error)
              toast.error(t('common.error'), t('common.tryAgain'))
            } finally {
              setIsDeletingCoachingData(false)
            }
          },
        },
      ]
    )
  }, [user?.id, resetSession, t, toast])

  const handleOpenNicknameModal = useCallback(() => {
    setNicknameInput(nickname)
    setNicknameError('')
    setShowNicknameModal(true)
  }, [nickname])

  const handleSaveNickname = useCallback(async () => {
    if (!user?.id) return

    const trimmed = nicknameInput.trim()

    // Validation
    if (trimmed.length < 2) {
      setNicknameError(t('settings.nickname.errors.tooShort'))
      return
    }
    if (trimmed.length > 12) {
      setNicknameError(t('settings.nickname.errors.tooLong'))
      return
    }

    setIsSavingNickname(true)
    setNicknameError('')

    try {
      const { error } = await supabase
        .from('user_levels')
        .upsert(
          { user_id: user.id, nickname: trimmed },
          { onConflict: 'user_id' }
        )

      if (error) {
        if (error.code === '23505') {
          setNicknameError(t('settings.nickname.errors.alreadyTaken'))
        } else {
          setNicknameError(t('settings.nickname.errors.updateError'))
        }
        return
      }

      setCachedGamificationNickname(queryClient, user.id, trimmed)
      void queryClient.invalidateQueries({ queryKey: statsKeys.gamification(user.id) })
      setShowNicknameModal(false)
    } catch {
      setNicknameError(t('settings.nickname.errors.updateError'))
    } finally {
      setIsSavingNickname(false)
    }
  }, [nicknameInput, user?.id, queryClient, t])

  const handleToggleNotifications = useCallback(async (value: boolean) => {
    const success = await toggleNotifications(value)

    if (!success && value) {
      Alert.alert(
        t('settings.notifications.permissionRequired'),
        t('settings.notifications.permissionMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.notifications.goToSettings'),
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
  }, [toggleNotifications, t])

  const handleOpenTimePicker = useCallback(() => {
    setSelectedHour(reminderTime.hour)
    setSelectedMinute(reminderTime.minute)
    setShowTimePicker(true)
  }, [reminderTime])

  const handleSaveTime = useCallback(async () => {
    await updateReminderTime(selectedHour, selectedMinute)
    setShowTimePicker(false)
    Alert.alert(
      t('settings.notifications.reminderTimeSet'),
      t('settings.notifications.reminderTimeConfirm', { time: formatTimeDisplay(selectedHour, selectedMinute) })
    )
  }, [selectedHour, selectedMinute, updateReminderTime, t])

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
      t('settings.info.appInfo'),
      t('settings.info.appInfoFormat', { appName: APP_NAME, version, build: buildNumber }),
      [{ text: t('common.confirm') }]
    )
  }, [t])

  const handlePrivacyPolicy = useCallback(() => {
    handleOpenURL('https://mandaact.vercel.app/privacy')
  }, [handleOpenURL])

  const handleManagePrivacyChoices = useCallback(async () => {
    try {
      const consentInfo = await AdsConsent.requestInfoUpdate()
      if (consentInfo.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED) {
        await AdsConsent.showPrivacyOptionsForm()
        return
      }
      toast.info(
        t('settings.info.privacyChoicesUnavailableTitle'),
        t('settings.info.privacyChoicesUnavailableDesc')
      )
    } catch (error) {
      console.error('[SettingsScreen] Failed to open privacy choices:', error)
      toast.error(t('common.error'), t('settings.info.privacyChoicesError'))
    }
  }, [t, toast])

  const handleFeedback = useCallback(() => {
    Alert.alert(t('settings.support.feedback'), t('settings.support.feedbackConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.support.feedbackEmail'),
        onPress: () => handleOpenURL('mailto:support@unwrittenbd.com?subject=MandaAct Feedback'),
      },
    ])
  }, [handleOpenURL, t])

  const handleRateApp = useCallback(() => {
    Alert.alert(t('settings.support.rateApp'), t('settings.support.rateConfirm'), [
      { text: t('settings.support.rateLater'), style: 'cancel' },
      {
        text: t('settings.support.rateNow'),
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
  }, [handleOpenURL, t])

  const handleLanguageSelect = useCallback(async (lang: SupportedLanguage) => {
    await changeLanguage(lang)
    setCurrentLang(lang)
    setShowLanguageModal(false)
  }, [])

  const handleTimezoneSelect = useCallback(async (tz: string) => {
    setIsSavingTimezone(true)
    try {
      const success = await updateTimezone(tz)
      if (success) {
        setShowTimezoneModal(false)
      }
    } finally {
      setIsSavingTimezone(false)
    }
  }, [updateTimezone])

  // Get current language display name
  const currentLanguageDisplay = supportedLanguages.find(l => l.code === currentLang)?.nativeName || 'Unknown'

  // Get current timezone display name
  const currentTimezoneDisplay = TIMEZONE_OPTIONS.find(tz => tz.value === timezone)?.[currentLang === 'en' ? 'labelEn' : 'label'] || timezone

  return (
    <View className="flex-1 bg-gray-50">
      <Header showBackButton title={t('settings.title')} />
      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ alignItems: 'center' }}>
        {/* Content Container - max width for tablet */}
        <View style={{ width: '100%', maxWidth: 500 }}>

          {/* User Info Card */}
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-5 mb-5 border border-gray-100"
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
                  {nickname || t('home.nickname.placeholder')}
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
                  <MaskedView
                    maskElement={
                      <Text
                        className="text-sm"
                        style={{ fontFamily: 'Pretendard-Medium' }}
                      >
                        {t('settings.daysWithUs', { days: differenceInCalendarDays(new Date(), new Date(user.created_at)) + 1 })}
                      </Text>
                    }
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text
                        className="text-sm opacity-0"
                        style={{ fontFamily: 'Pretendard-Medium' }}
                      >
                        {t('settings.daysWithUs', { days: differenceInCalendarDays(new Date(), new Date(user.created_at)) + 1 })}
                      </Text>
                    </LinearGradient>
                  </MaskedView>
                </>
              )}
            </View>
          </Animated.View>

          {/* Premium Section */}
          <Animated.View
            entering={FadeInUp.delay(125).duration(400)}
            className="mb-5"
          >
            <Pressable
              onPress={() => navigation.navigate('Subscription')}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
                minHeight: 72,
              }}
            >
              {isPremium ? (
                // Premium Active Card - Minimal, gradient accents only
                <View className="bg-white rounded-2xl px-5 py-4 flex-row items-center">
                  <LinearGradient
                    colors={['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ width: 40, height: 40, borderRadius: 999, padding: 2 }}
                  >
                    <View className="flex-1 rounded-full bg-white items-center justify-center">
                      <Crown size={18} color="#7c3aed" />
                    </View>
                  </LinearGradient>

                  <View className="flex-1 ml-3">
                    <MaskedView
                      maskElement={
                        <Text
                          className="text-base"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {t('subscription.growingWithPremium')}
                        </Text>
                      }
                    >
                      <LinearGradient
                        colors={['#2563eb', '#9333ea', '#db2777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text
                          className="text-base opacity-0"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {t('subscription.growingWithPremium')}
                        </Text>
                      </LinearGradient>
                    </MaskedView>

                    <Text
                      className="text-xs text-gray-500 mt-0.5"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('subscription.enjoyAllFeatures')}
                    </Text>
                  </View>

                  <ChevronRight size={18} color="#9ca3af" />
                </View>
              ) : (
                // Free Tier - Upgrade CTA. Consistent container, emphasized content.
                <View className="px-5 py-4 flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center">
                    <Crown size={20} color="#7c3aed" />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text
                      className="text-base text-gray-900"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      {t('subscription.title')}
                    </Text>
                    <Text
                      className="text-xs text-gray-500"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('subscription.focusOnGoals')}
                    </Text>
                  </View>
                  {/* Gradient text CTA for emphasis */}
                  <MaskedView
                    maskElement={
                      <Text
                        className="text-sm"
                        style={{ fontFamily: 'Pretendard-Bold' }}
                      >
                        {t('subscription.upgrade')}
                      </Text>
                    }
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text
                        className="text-sm opacity-0"
                        style={{ fontFamily: 'Pretendard-Bold' }}
                      >
                        {t('subscription.upgrade')}
                      </Text>
                    </LinearGradient>
                  </MaskedView>
                  <ChevronRight size={18} color="#9ca3af" style={{ marginLeft: 2 }} />
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* App Settings Section */}
          <Text
            className="text-sm text-gray-500 mb-2 ml-1"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('settings.app.title')}
          </Text>
          <Animated.View
            entering={FadeInUp.delay(150).duration(400)}
            className="bg-white rounded-2xl overflow-hidden mb-5 border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            {/* Language Setting */}
            <Pressable
              onPress={() => setShowLanguageModal(true)}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <Globe size={22} color="#6b7280" />
              <Text
                className="flex-1 ml-3 text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('settings.app.language')}
              </Text>
              <Text
                className="text-sm text-gray-400 mr-1"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {currentLanguageDisplay}
              </Text>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>

            {/* Timezone Setting */}
            <Pressable
              onPress={() => setShowTimezoneModal(true)}
              className="flex-row items-center px-5 py-4"
            >
              <Clock size={22} color="#6b7280" />
              <Text
                className="flex-1 ml-3 text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('settings.app.timezone')}
              </Text>
              <Text
                className="text-sm text-gray-400 mr-1"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {currentTimezoneDisplay}
              </Text>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
          </Animated.View>

          {/* Focus Mode Section - Only for Free users (Premium users are always ad-free) */}
          {!isPremium && (
            <>
              <Text
                className="text-sm text-gray-500 mb-2 ml-1"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('settings.focus.title')}
              </Text>
              <Animated.View
                entering={FadeInUp.delay(175).duration(400)}
                className="bg-white rounded-2xl overflow-hidden mb-5 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                <Pressable
                  onPress={handleFocusModePress}
                  disabled={isAdLoading || isActivatingFocus || isAdFreeLoading}
                  className="flex-row items-center px-5 py-4"
                >
                  <Shield size={20} color={isAdFree ? '#7c3aed' : '#6b7280'} />
                  <View className="flex-1 ml-3">
                    <Text
                      className={`text-base ${isAdFree ? 'text-violet-700' : 'text-gray-900'}`}
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      {t('ads.adFree.button')}
                    </Text>
                    <Text
                      className={`text-xs mt-0.5 ${isAdFree ? 'text-violet-500' : 'text-gray-500'}`}
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {isAdFree
                        ? t('ads.adFree.remaining', { time: remainingTimeFormatted })
                        : t('ads.adFree.subtitle')
                      }
                    </Text>
                  </View>
                  {isAdLoading || isActivatingFocus ? (
                    <ActivityIndicator size="small" color="#7c3aed" />
                  ) : isAdFree ? (
                    <View className="bg-violet-100 px-2 py-1 rounded-full">
                      <Text
                        className="text-xs text-violet-700"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        {t('ads.adFree.activeTitle')}
                      </Text>
                    </View>
                  ) : (
                    <View className="w-8 h-8 rounded-full items-center justify-center bg-gray-100">
                      <Play size={14} color="#6b7280" fill="#6b7280" />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            </>
          )}

          {/* Privacy & AI Data Section - AI Coaching PAUSED (2026-01-17) */}
          {/* See docs/AI_COACHING_PAUSE.md */}
          {/*
          <Text
            className="text-sm text-gray-500 mb-2 ml-1"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('settings.privacy.title')}
          </Text>
          <Animated.View
            entering={FadeInUp.delay(185).duration(400)}
            className="bg-white rounded-2xl overflow-hidden mb-5 border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <Pressable
              onPress={handleDeleteCoachingData}
              disabled={isDeletingCoachingData}
              className="flex-row items-center px-5 py-4"
            >
              <Trash2 size={22} color="#ef4444" />
              <View className="flex-1 ml-3">
                <Text
                  className="text-base text-red-500"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  {t('settings.privacy.deleteCoachingData')}
                </Text>
              </View>
              {isDeletingCoachingData ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <ChevronRight size={18} color="#9ca3af" />
              )}
            </Pressable>
          </Animated.View>
          */}

          {/* Notification Settings */}
          <Text
            className="text-sm text-gray-500 mb-2 ml-1"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('settings.app.notifications')}
          </Text>
          <Animated.View
            entering={FadeInUp.delay(200).duration(400)}
            className="bg-white rounded-2xl overflow-hidden mb-5 border border-gray-100"
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
                  {t('settings.notifications.pushNotifications')}
                </Text>
                {isPermissionDenied && (
                  <Text
                    className="text-xs text-red-500 mt-0.5"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {t('settings.notifications.permissionDenied')}
                  </Text>
                )}
              </View>
              <Toggle
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                loading={notificationLoading}
              />
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
                    {t('settings.notifications.reminder')}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${notificationsEnabled ? 'text-gray-500' : 'text-gray-400'}`}
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {t('settings.notifications.reminderDesc')}
                  </Text>
                </View>
                <Toggle
                  value={notificationsEnabled && reminderEnabled}
                  onValueChange={(value) => { toggleReminder(value) }}
                  disabled={!notificationsEnabled || notificationLoading}
                  size="sm"
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
                    {t('settings.notifications.reminderTime')}
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
                    {t('settings.notifications.customMessage')}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${notificationsEnabled ? 'text-gray-500' : 'text-gray-400'}`}
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {t('settings.notifications.customMessageDesc')}
                  </Text>
                </View>
                <Toggle
                  value={notificationsEnabled && customMessageEnabled}
                  onValueChange={(value) => { toggleCustomMessage(value) }}
                  disabled={!notificationsEnabled || notificationLoading}
                  size="sm"
                />
              </View>
            </View>

          </Animated.View>

          {/* Support Section */}
          <Text
            className="text-sm text-gray-500 mb-2 ml-1"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('settings.support.title')}
          </Text>
          <Animated.View
            entering={FadeInUp.delay(300).duration(400)}
            className="bg-white rounded-2xl overflow-hidden mb-5 border border-gray-100"
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
                {t('settings.app.tutorial')}
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
                {t('settings.support.feedback')}
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
                {t('settings.support.rateApp')}
              </Text>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
          </Animated.View>

          {/* Info Section */}
          <Text
            className="text-sm text-gray-500 mb-2 ml-1"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('settings.info.title')}
          </Text>
          <Animated.View
            entering={FadeInUp.delay(400).duration(400)}
            className="bg-white rounded-2xl overflow-hidden mb-5 border border-gray-100"
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
                {t('settings.info.appInfo')}
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
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <Shield size={22} color="#6b7280" />
              <Text
                className="flex-1 ml-3 text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('settings.info.privacyPolicy')}
              </Text>
              <ExternalLink size={16} color="#9ca3af" />
            </Pressable>
            <Pressable
              onPress={handleManagePrivacyChoices}
              className="flex-row items-center px-5 py-4"
            >
              <SlidersHorizontal size={22} color="#6b7280" />
              <Text
                className="flex-1 ml-3 text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('settings.info.privacyChoices')}
              </Text>
              <ChevronRight size={18} color="#9ca3af" />
            </Pressable>
          </Animated.View>

          {/* Account Actions */}
          <Text
            className="text-sm text-gray-500 mb-2 ml-1"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('settings.account.title')}
          </Text>
          <Animated.View
            entering={FadeInUp.delay(450).duration(400)}
            className="bg-white rounded-2xl overflow-hidden mb-5 border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            {/* Sign Out */}
            <Pressable
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
              onPress={handleSignOut}
              disabled={loading || isSigningOut || isDeletingAccount}
            >
              {isSigningOut ? (
                <ActivityIndicator size="small" color="#9ca3af" />
              ) : (
                <LogOut size={22} color="#6b7280" />
              )}
              <Text
                className="ml-3 text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('settings.account.logout')}
              </Text>
            </Pressable>

            {/* Delete Account */}
            <Pressable
              className="flex-row items-center px-5 py-4"
              onPress={handleDeleteAccount}
              disabled={loading || isSigningOut || isDeletingAccount}
            >
              {isDeletingAccount ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Trash2 size={22} color="#ef4444" />
              )}
              <Text
                className="ml-3 text-base text-red-500"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('settings.account.deleteAccount')}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Footer */}
          <View className="items-center pb-8">
            <Text
              className="text-xs text-gray-400"
              style={{ fontFamily: 'Pretendard-Medium' }}
            >
              {t('settings.footer', { appName: APP_NAME })}
            </Text>
            <Text
              className="text-xs text-gray-300 mt-1"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {t('settings.copyright', { appName: APP_NAME })}
            </Text>
          </View>
        </View>{/* End Content Container */}
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
                {t('settings.notifications.timePickerTitle')}
              </Text>
              <Pressable onPress={handleSaveTime} className="p-2">
                <Check size={24} color="#2563eb" />
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
                  {t('settings.notifications.hour')}
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
                      className={`py-2 px-6 ${selectedHour === hour ? 'bg-primary/10 rounded-xl' : ''
                        }`}
                    >
                      <Text
                        className="text-2xl"
                        style={{
                          fontFamily: selectedHour === hour ? 'Pretendard-Bold' : 'Pretendard-Regular',
                          color: selectedHour === hour ? '#2563eb' : '#9ca3af',
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
                  {t('settings.notifications.minute')}
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
                      className={`py-2 px-6 ${selectedMinute === minute
                        ? 'bg-primary/10 rounded-xl'
                        : ''
                        }`}
                    >
                      <Text
                        className="text-2xl"
                        style={{
                          fontFamily: selectedMinute === minute ? 'Pretendard-Bold' : 'Pretendard-Regular',
                          color: selectedMinute === minute ? '#2563eb' : '#9ca3af',
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
                {t('settings.notifications.dailyAt', { time: '' })}
                <Text
                  className="text-primary"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  {formatTimeDisplay(selectedHour, selectedMinute, i18n.language)}
                </Text>
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
                  {t('settings.nickname.title')}
                </Text>
                <Pressable
                  onPress={handleSaveNickname}
                  className="p-2"
                  disabled={isSavingNickname}
                >
                  {isSavingNickname ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <Check size={24} color="#2563eb" />
                  )}
                </Pressable>
              </View>

              {/* Input */}
              <View className="px-5 py-6">
                <TextInput
                  value={nicknameInput}
                  onChangeText={setNicknameInput}
                  placeholder={t('settings.nickname.placeholder')}
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
                    {t('settings.nickname.hint')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl pt-4 pb-6 w-full" style={{ maxWidth: 400 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100">
              <Pressable
                onPress={() => setShowLanguageModal(false)}
                className="p-2"
              >
                <X size={24} color="#6b7280" />
              </Pressable>
              <Text
                className="text-lg text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('settings.language.title')}
              </Text>
              <View className="p-2 w-10" />
            </View>

            {/* Description */}
            <View className="px-5 pt-4 pb-2">
              <Text
                className="text-sm text-gray-500"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('settings.language.description')}
              </Text>
            </View>

            {/* Language Options */}
            <View className="px-5 py-4">
              {supportedLanguages.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageSelect(lang.code)}
                  className={`flex-row items-center px-4 py-4 rounded-xl mb-2 ${currentLang === lang.code
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-gray-50 border border-gray-100'
                    }`}
                >
                  <Text
                    className={`flex-1 text-base ${currentLang === lang.code ? 'text-primary' : 'text-gray-900'
                      }`}
                    style={{
                      fontFamily:
                        currentLang === lang.code
                          ? 'Pretendard-SemiBold'
                          : 'Pretendard-Regular',
                    }}
                  >
                    {lang.nativeName}
                  </Text>
                  {currentLang === lang.code && (
                    <Check size={20} color="#2563eb" />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Timezone Selection Modal */}
      <Modal
        visible={showTimezoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimezoneModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl pt-4 pb-6 w-full max-h-[70%]" style={{ maxWidth: 400 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-100">
              <Pressable
                onPress={() => setShowTimezoneModal(false)}
                className="p-2"
                disabled={isSavingTimezone}
              >
                <X size={24} color="#6b7280" />
              </Pressable>
              <Text
                className="text-lg text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('settings.timezone.title')}
              </Text>
              <View className="p-2 w-10" />
            </View>

            {/* Description */}
            <View className="px-5 pt-4 pb-2">
              <Text
                className="text-sm text-gray-500"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('settings.timezone.description')}
              </Text>
            </View>

            {/* Timezone Options */}
            <ScrollView className="px-5 py-4">
              {TIMEZONE_OPTIONS.map((tz) => (
                <Pressable
                  key={tz.value}
                  onPress={() => handleTimezoneSelect(tz.value)}
                  disabled={isSavingTimezone}
                  className={`flex-row items-center px-4 py-4 rounded-xl mb-2 ${timezone === tz.value
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-gray-50 border border-gray-100'
                    } ${isSavingTimezone ? 'opacity-50' : ''}`}
                >
                  <Clock
                    size={20}
                    color={timezone === tz.value ? '#2563eb' : '#6b7280'}
                  />
                  <View className="flex-1 ml-3">
                    <Text
                      className={`text-base ${timezone === tz.value ? 'text-primary' : 'text-gray-900'
                        }`}
                      style={{
                        fontFamily:
                          timezone === tz.value
                            ? 'Pretendard-SemiBold'
                            : 'Pretendard-Regular',
                      }}
                    >
                      {currentLang === 'en' ? tz.labelEn : tz.label}
                    </Text>
                    <Text
                      className="text-xs text-gray-400 mt-0.5"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      UTC{tz.offset}
                    </Text>
                  </View>
                  {timezone === tz.value && (
                    isSavingTimezone ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <Check size={20} color="#2563eb" />
                    )
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// Helper function to format time display with localization
function formatTimeDisplay(hour: number, minute: number, language = 'ko'): string {
  const displayMinute = minute.toString().padStart(2, '0')

  if (language === 'en') {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${displayMinute} ${period}`
  }

  // Korean format (default)
  const period = hour >= 12 ? '오후' : '오전'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${period} ${displayHour}:${displayMinute}`
}
