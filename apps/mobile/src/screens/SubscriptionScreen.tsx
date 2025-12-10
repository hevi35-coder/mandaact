import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
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

import { Header } from '../components'
import { useSubscriptionContext, FREE_MANDALART_LIMIT } from '../context'
import { useToast } from '../components/Toast'

// Premium benefits list
const PREMIUM_BENEFITS = [
  { icon: Infinity, key: 'unlimitedMandalarts' },
  { icon: FileText, key: 'unlimitedReports' },
  { icon: Ban, key: 'noAds' },
  { icon: Sparkles, key: 'prioritySupport' },
]

export default function SubscriptionScreen() {
  const { t } = useTranslation()
  const toast = useToast()
  const {
    subscriptionInfo,
    isLoading,
    packages,
    purchase,
    restore,
    isPremium,
  } = useSubscriptionContext()

  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  // Handle purchase
  const handlePurchase = useCallback(async (pkg: PurchasesPackage) => {
    setPurchasingPackageId(pkg.identifier)
    try {
      const success = await purchase(pkg)
      if (success) {
        toast.success(
          t('subscription.purchaseSuccess'),
          t('subscription.welcomePremium')
        )
      }
    } catch (error) {
      console.error('[SubscriptionScreen] Purchase error:', error)
      toast.error(t('common.error'), t('subscription.purchaseError'))
    } finally {
      setPurchasingPackageId(null)
    }
  }, [purchase, toast, t])

  // Handle restore
  const handleRestore = useCallback(async () => {
    setIsRestoring(true)
    try {
      const success = await restore()
      if (success) {
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
  }, [restore, toast, t])

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
              <LinearGradient
                colors={['#7c3aed', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl p-5"
                style={{
                  shadowColor: '#7c3aed',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <View className="flex-row items-center mb-3">
                  <Crown size={28} color="#fbbf24" fill="#fbbf24" />
                  <Text
                    className="text-xl text-white ml-2"
                    style={{ fontFamily: 'Pretendard-Bold' }}
                  >
                    {t('subscription.premiumActive')}
                  </Text>
                </View>
                <Text
                  className="text-white/80 text-sm"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  {subscriptionInfo.expiresAt
                    ? t('subscription.expiresAt', {
                        date: subscriptionInfo.expiresAt.toLocaleDateString(),
                      })
                    : t('subscription.activeSubscription')}
                </Text>
                {subscriptionInfo.plan && (
                  <View className="mt-3 pt-3 border-t border-white/20">
                    <Text
                      className="text-white/60 text-xs"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {subscriptionInfo.willRenew
                        ? t('subscription.autoRenew')
                        : t('subscription.cancelledNoRenew')}
                    </Text>
                  </View>
                )}
              </LinearGradient>
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
                            colors={['#7c3aed', '#2563eb']}
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

          {/* Manage Subscription (for Premium users) */}
          {isPremium && (
            <Animated.View entering={FadeInUp.delay(150).duration(400)}>
              <Pressable
                onPress={() => {
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
