import React, { useCallback, useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import {
  Crown,
  Check,
  Sparkles,
  Infinity,
  FileText,
  Ban,
  RefreshCw,
  ChevronRight,
} from 'lucide-react-native'
import { PurchasesPackage } from 'react-native-purchases'
import MaskedView from '@react-native-masked-view/masked-view'

import { Header } from '../components'
import { useSubscriptionContext, FREE_MANDALART_LIMIT } from '../context'
import { useToast } from '../components/Toast'
import { formatNumericDate, trackPaywallViewed } from '../lib'
import { useAuthStore } from '../store/authStore'
import { useUserProfile } from '../hooks/useUserProfile'

// Premium benefits list
const PREMIUM_BENEFITS = [
  { icon: Infinity, key: 'unlimitedMandalarts' },
  { icon: FileText, key: 'unlimitedReports' },
  { icon: Ban, key: 'noAds' },
  { icon: Sparkles, key: 'prioritySupport' },
]

export default function SubscriptionScreen() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const { user } = useAuthStore()
  const { timezone } = useUserProfile(user?.id)
  const {
    subscriptionInfo,
    isLoading,
    error,
    packages,
    purchase,
    restore,
    refreshSubscription,
    isPremium,
  } = useSubscriptionContext()

  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const [justPurchased, setJustPurchased] = useState(false)

  useEffect(() => {
    trackPaywallViewed({ source_screen: 'subscription_screen' })
  }, [])

  // Scroll to top when becoming premium
  useEffect(() => {
    if (isPremium && justPurchased) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      // Reset flag after animation
      const timer = setTimeout(() => setJustPurchased(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isPremium, justPurchased])

  // Handle purchase
  const handlePurchase = useCallback(async (pkg: PurchasesPackage) => {
    console.log('[SubscriptionScreen] 🟣 Package pressed:', pkg.identifier)
    setPurchasingPackageId(pkg.identifier)
    try {
      const success = await purchase(pkg)
      if (success) {
        setJustPurchased(true)

        // CRITICAL: Explicitly refresh subscription state to ensure UI updates immediately
        // This forces a re-render of all components using subscription context
        console.log('[SubscriptionScreen] 🔄 Forcing subscription refresh after purchase...')
        await refreshSubscription()

        toast.success(
          t('subscription.purchaseSuccess'),
          t('subscription.welcomePremium')
        )
      }
    } catch (error) {
      console.error('[SubscriptionScreen] Purchase error:', error)
      const details =
        error && typeof error === 'object'
          ? (error as { readableErrorCode?: string; code?: string | number; message?: string })
          : null
      const code = details?.readableErrorCode ?? (typeof details?.code === 'string' || typeof details?.code === 'number' ? String(details?.code) : null)
      const message = typeof details?.message === 'string' ? details.message : null
      const suffix = code ? ` (code: ${code})` : message ? ` (${message})` : ''
      toast.error(t('common.error'), `${t('subscription.purchaseError')}${suffix}`)
    } finally {
      setPurchasingPackageId(null)
    }
  }, [purchase, refreshSubscription, toast, t])

  // Handle restore
  const handleRestore = useCallback(async () => {
    setIsRestoring(true)
    try {
      const success = await restore()
      if (success) {
        // CRITICAL: Explicitly refresh subscription state after restore
        console.log('[SubscriptionScreen] 🔄 Forcing subscription refresh after restore...')
        await refreshSubscription()

        toast.success(
          t('subscription.restoreSuccess'),
          t('subscription.restoreSuccessDesc')
        )
      } else {
        Alert.alert(
          t('subscription.restoreTitle'),
          t('subscription.noSubscriptionFound')
        )
      }
    } catch (error) {
      console.error('[SubscriptionScreen] Restore error:', error)
      toast.error(t('common.error'), t('subscription.restoreError'))
    } finally {
      setIsRestoring(false)
    }
  }, [restore, refreshSubscription, toast, t])

  // Get package display info (monthly or yearly only)
  const getPackageInfo = (pkg: PurchasesPackage) => {
    const id = pkg.identifier.toLowerCase()
    let type: 'monthly' | 'yearly' = 'monthly'
    let highlight = false
    let savings = ''

    if (id.includes('yearly') || id.includes('annual')) {
      type = 'yearly'
      highlight = true
      // Calculate savings compared to monthly
      const monthlyPkg = packages.find(p => p.identifier.toLowerCase().includes('monthly'))
      if (monthlyPkg) {
        const monthlyPrice = monthlyPkg.product.price * 12
        const yearlyPrice = pkg.product.price
        const savingsPercent = Math.round((1 - yearlyPrice / monthlyPrice) * 100)
        if (savingsPercent > 0) {
          savings = t('subscription.save', { percent: savingsPercent })
        }
      }
    }

    return { type, highlight, savings }
  }

  const formatExpiryDate = useCallback((value: unknown) => {
    if (!(value instanceof Date)) return null
    if (Number.isNaN(value.getTime())) return null
    return formatNumericDate(value, { language: i18n.language, timeZone: timezone })
  }, [i18n.language, timezone])

  // Format plan label
  const getPlanLabel = (type: 'monthly' | 'yearly') => {
    switch (type) {
      case 'monthly':
        return t('subscription.plans.monthly')
      case 'yearly':
        return t('subscription.plans.yearly')
    }
  }

  // Format period label
  const getPeriodLabel = (type: 'monthly' | 'yearly') => {
    switch (type) {
      case 'monthly':
        return t('subscription.period.month')
      case 'yearly':
        return t('subscription.period.year')
    }
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header showBackButton title={t('subscription.title')} />
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ padding: 20, alignItems: 'center' }}
      >
        {/* Content Container - max width for tablet */}
        <View style={{ width: '100%', maxWidth: 500 }}>
          {/* Current Status Card */}
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="mb-6"
          >
            {isPremium ? (
              // Premium Status Card
              <View
                className="bg-white rounded-2xl overflow-hidden border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                <View className="px-5 py-4 flex-row items-center">
                  <LinearGradient
                    colors={['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ width: 36, height: 36, borderRadius: 999, padding: 2 }}
                  >
                    <View className="flex-1 rounded-full bg-white items-center justify-center">
                      <Crown size={16} color="#7c3aed" />
                    </View>
                  </LinearGradient>

                  <MaskedView
                    maskElement={
                      <Text
                        className="text-base ml-3"
                        style={{ fontFamily: 'Pretendard-Bold' }}
                      >
                        {t('subscription.premiumActive')}
                      </Text>
                    }
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text
                        className="text-base ml-3 opacity-0"
                        style={{ fontFamily: 'Pretendard-Bold' }}
                      >
                        {t('subscription.premiumActive')}
                      </Text>
                    </LinearGradient>
                  </MaskedView>
                </View>

                <View className="px-5 pb-4">
                  <Text
                    className="text-sm text-gray-700"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {(() => {
                      const date = formatExpiryDate(subscriptionInfo.expiresAt)
                      if (!date) return t('subscription.activeSubscription')
                      return t('subscription.expiresAt', { date })
                    })()}
                  </Text>

                  {subscriptionInfo.plan && (
                    <Text
                      className="text-xs text-gray-500 mt-2"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {subscriptionInfo.willRenew
                        ? t('subscription.autoRenew')
                        : t('subscription.cancelledNoRenew')}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              // Free Status Card
              <View
                className="bg-white rounded-2xl p-5 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                    <Crown size={20} color="#9ca3af" />
                  </View>
                  <View className="ml-3">
                    <Text
                      className="text-lg text-gray-900"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      {t('subscription.freePlan')}
                    </Text>
                    <Text
                      className="text-sm text-gray-500"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('subscription.freeLimit', { count: FREE_MANDALART_LIMIT })}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Premium Benefits Section */}
          {!isPremium && (
            <>
              {!!error && (
                <View className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                  <Text
                    className="text-sm text-red-700"
                    style={{ fontFamily: 'Pretendard-Medium' }}
                  >
                    {error}
                  </Text>
                </View>
              )}

              <Text
                className="text-sm text-gray-500 mb-3 ml-1"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('subscription.premiumBenefits')}
              </Text>
              <Animated.View
                entering={FadeInUp.delay(150).duration(400)}
                className="bg-white rounded-2xl p-4 mb-6 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                {PREMIUM_BENEFITS.map((benefit, index) => (
                  <View
                    key={benefit.key}
                    className={`flex-row items-center py-3 ${
                      index < PREMIUM_BENEFITS.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="w-8 h-8 rounded-full bg-violet-100 items-center justify-center">
                      <benefit.icon size={16} color="#7c3aed" />
                    </View>
                    <Text
                      className="flex-1 ml-3 text-base text-gray-900"
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      {t(`subscription.benefits.${benefit.key}`)}
                    </Text>
                    <Check size={18} color="#22c55e" />
                  </View>
                ))}
              </Animated.View>

              {/* Pricing Cards */}
              <Text
                className="text-sm text-gray-500 mb-3 ml-1"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('subscription.choosePlan')}
              </Text>

              {isLoading ? (
                <View className="py-12 items-center">
                  <ActivityIndicator size="large" color="#7c3aed" />
                  <Text
                    className="text-gray-500 mt-3"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {t('subscription.loadingPlans')}
                  </Text>
                </View>
              ) : packages.length === 0 ? (
                <View className="py-12 items-center bg-white rounded-2xl">
                  <Text
                    className="text-gray-500"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {t('subscription.noPlansAvailable')}
                  </Text>
                </View>
              ) : (
                <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                  {packages.map((pkg, index) => {
                    const { type, highlight, savings } = getPackageInfo(pkg)
                    const isPurchasing = purchasingPackageId === pkg.identifier

                    return (
                      <Pressable
                        key={pkg.identifier}
                        onPress={() => handlePurchase(pkg)}
                        disabled={isPurchasing || purchasingPackageId !== null}
                        className={`mb-3 rounded-2xl overflow-hidden ${
                          isPurchasing ? 'opacity-70' : ''
                        }`}
                      >
                        {highlight ? (
                          <LinearGradient
                            colors={['#2563eb', '#9333ea', '#db2777']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            className="p-0.5 rounded-2xl"
                          >
                            <View className="bg-white rounded-[14px] p-4">
                              <View className="flex-row items-center justify-between">
                                <View>
                                  <View className="flex-row items-center">
                                    <Text
                                      className="text-lg text-gray-900"
                                      style={{ fontFamily: 'Pretendard-Bold' }}
                                    >
                                      {getPlanLabel(type)}
                                    </Text>
                                    {savings && (
                                      <View className="ml-2 bg-green-100 px-2 py-0.5 rounded-full">
                                        <Text
                                          className="text-xs text-green-700"
                                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                                        >
                                          {savings}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text
                                    className="text-sm text-gray-500 mt-1"
                                    style={{ fontFamily: 'Pretendard-Regular' }}
                                  >
                                    {t('subscription.bestValue')}
                                  </Text>
                                </View>
                                <View className="items-end">
                                  {isPurchasing ? (
                                    <ActivityIndicator size="small" color="#7c3aed" />
                                  ) : (
                                    <>
                                      <Text
                                        className="text-xl text-gray-900"
                                        style={{ fontFamily: 'Pretendard-Bold' }}
                                      >
                                        {pkg.product.priceString}
                                      </Text>
                                      <Text
                                        className="text-xs text-gray-400"
                                        style={{ fontFamily: 'Pretendard-Regular' }}
                                      >
                                        {getPeriodLabel(type)}
                                      </Text>
                                    </>
                                  )}
                                </View>
                              </View>
                            </View>
                          </LinearGradient>
                        ) : (
                          <View
                            className="bg-white rounded-2xl p-4 border border-gray-200"
                            style={{
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.04,
                              shadowRadius: 8,
                              elevation: 2,
                            }}
                          >
                            <View className="flex-row items-center justify-between">
                              <View>
                                <Text
                                  className="text-lg text-gray-900"
                                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                                >
                                  {getPlanLabel(type)}
                                </Text>
                              </View>
                              <View className="items-end">
                                {isPurchasing ? (
                                  <ActivityIndicator size="small" color="#7c3aed" />
                                ) : (
                                  <>
                                    <Text
                                      className="text-xl text-gray-900"
                                      style={{ fontFamily: 'Pretendard-Bold' }}
                                    >
                                      {pkg.product.priceString}
                                    </Text>
                                    <Text
                                      className="text-xs text-gray-400"
                                      style={{ fontFamily: 'Pretendard-Regular' }}
                                    >
                                      {getPeriodLabel(type)}
                                    </Text>
                                  </>
                                )}
                              </View>
                            </View>
                          </View>
                        )}
                      </Pressable>
                    )
                  })}
                </Animated.View>
              )}

              {/* Restore Purchases */}
              <Animated.View entering={FadeInUp.delay(250).duration(400)}>
                <Pressable
                  onPress={handleRestore}
                  disabled={isRestoring}
                  className="flex-row items-center justify-center py-4 mt-4"
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color="#6b7280" />
                  ) : (
                    <RefreshCw size={18} color="#6b7280" />
                  )}
                  <Text
                    className="text-gray-500 ml-2"
                    style={{ fontFamily: 'Pretendard-Medium' }}
                  >
                    {t('subscription.restorePurchases')}
                  </Text>
                </Pressable>
              </Animated.View>
            </>
          )}

          {/* Active Benefits (for Premium users) */}
          {isPremium && (
            <>
              <Text
                className="text-sm text-gray-500 mb-3 ml-1"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('subscription.activeBenefits')}
              </Text>
              <Animated.View
                entering={FadeInUp.delay(150).duration(400)}
                className="bg-white rounded-2xl p-4 mb-6 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                {PREMIUM_BENEFITS.map((benefit, index) => (
                  <View
                    key={benefit.key}
                    className={`flex-row items-center py-3 ${
                      index < PREMIUM_BENEFITS.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <View className="w-8 h-8 rounded-full bg-violet-100 items-center justify-center">
                      <benefit.icon size={16} color="#7c3aed" />
                    </View>
                    <Text
                      className="flex-1 ml-3 text-base text-gray-900"
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      {t(`subscription.benefits.${benefit.key}`)}
                    </Text>
                    <View className="bg-green-100 px-2 py-1 rounded-full">
                      <Text
                        className="text-xs text-green-700"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        {t('subscription.active')}
                      </Text>
                    </View>
                  </View>
                ))}
              </Animated.View>

              {/* Manage Subscription */}
              <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                <Pressable
                  onPress={async () => {
                    // iOS: deep link to subscription management if possible
                    const url = Platform.OS === 'ios'
                      ? 'https://apps.apple.com/account/subscriptions'
                      : 'https://play.google.com/store/account/subscriptions'

                    try {
                      const canOpen = await Linking.canOpenURL(url)
                      if (canOpen) {
                        await Linking.openURL(url)
                        return
                      }
                    } catch {
                      // fallback to alert below
                    }

                    Alert.alert(
                      t('subscription.manageTitle'),
                      t('subscription.manageDescription'),
                      [{ text: t('common.ok') }]
                    )
                  }}
                  className="bg-white rounded-2xl p-4 flex-row items-center border border-gray-100"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                  }}
                >
                  <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                    <RefreshCw size={20} color="#6b7280" />
                  </View>
                  <Text
                    className="flex-1 ml-3 text-base text-gray-900"
                    style={{ fontFamily: 'Pretendard-Medium' }}
                  >
                    {t('subscription.manageSubscription')}
                  </Text>
                  <ChevronRight size={20} color="#9ca3af" />
                </Pressable>
              </Animated.View>
            </>
          )}

          {/* Footer - Subscription Terms */}
          <View className="items-center py-6">
            <Text
              className="text-xs text-gray-400 text-center px-4 leading-5"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {t('subscription.termsNotice')}
            </Text>

            {/* Terms of Use and Privacy Policy Links */}
            <View className="flex-row items-center justify-center mt-3 flex-wrap">
              <Pressable
                onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
              >
                <Text
                  className="text-xs text-primary underline"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {t('subscription.termsOfUse')}
                </Text>
              </Pressable>
              <Text
                className="text-xs text-gray-400 mx-2"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('subscription.and')}
              </Text>
              <Pressable
                onPress={() => Linking.openURL('https://hevi35-coder.github.io/mandaact-privacy/')}
              >
                <Text
                  className="text-xs text-primary underline"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {t('subscription.privacyPolicy')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
