import { useState, useEffect, useCallback } from 'react'
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PurchasesEntitlementInfo,
} from 'react-native-purchases'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import Constants from 'expo-constants'

// RevenueCat API Keys (from environment variables)
const REVENUECAT_IOS_API_KEY = Constants.expoConfig?.extra?.revenuecatIosApiKey || ''
const REVENUECAT_ANDROID_API_KEY = Constants.expoConfig?.extra?.revenuecatAndroidApiKey || ''

// Entitlement ID (configured in RevenueCat dashboard)
const PREMIUM_ENTITLEMENT_ID = 'premium'

// Free tier limits
export const FREE_MANDALART_LIMIT = 3
export const FREE_WEEKLY_REPORT_LIMIT = 1

export type SubscriptionStatus = 'free' | 'premium' | 'loading'

// Product IDs (must match App Store Connect)
// Note: Product IDs cannot be reused even after deletion
export const PRODUCT_IDS = {
  MONTHLY: 'com.mandaact.sub.premium.monthly',  // ₩4,400/month
  YEARLY: 'com.mandaact.sub.premium.yearly',     // ₩33,000/year (~38% savings)
} as const

export interface SubscriptionInfo {
  status: SubscriptionStatus
  isPremium: boolean
  expiresAt: Date | null
  plan: 'monthly' | 'yearly' | null
  willRenew: boolean
}

interface UseSubscriptionReturn {
  // Subscription state
  subscriptionInfo: SubscriptionInfo
  isLoading: boolean
  error: string | null

  // Available packages
  packages: PurchasesPackage[]

  // Actions
  purchase: (pkg: PurchasesPackage) => Promise<boolean>
  restore: () => Promise<boolean>
  refreshSubscription: () => Promise<void>

  // Limit checks
  canCreateMandalart: (currentCount: number) => boolean
  canGenerateReport: (weeklyCount: number) => boolean
}

// Initialize RevenueCat (call once at app startup)
export async function initializeRevenueCat(userId: string): Promise<void> {
  try {
    // Always set debug log level for now (to debug Sandbox issues)
    Purchases.setLogLevel(LOG_LEVEL.DEBUG)

    // Configure with platform-specific API key
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY

    console.log('[RevenueCat] Initializing...', {
      platform: Platform.OS,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...',
      userId,
    })

    if (!apiKey) {
      console.error('[RevenueCat] API key not configured!')
      return
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId,
    })

    console.log('[RevenueCat] Successfully initialized for user:', userId)
  } catch (error) {
    console.error('[RevenueCat] Failed to initialize:', error)
  }
}

// Hook to manage subscription state
export function useSubscription(userId: string | undefined): UseSubscriptionReturn {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    status: 'loading',
    isPremium: false,
    expiresAt: null,
    plan: null,
    willRenew: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [packages, setPackages] = useState<PurchasesPackage[]>([])

  // Parse customer info to subscription info
  const parseCustomerInfo = useCallback((customerInfo: CustomerInfo): SubscriptionInfo => {
    const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]

    if (!entitlement) {
      return {
        status: 'free',
        isPremium: false,
        expiresAt: null,
        plan: null,
        willRenew: false,
      }
    }

    // Determine plan type based on product identifier
    let plan: 'monthly' | 'yearly' | null = null
    const productId = entitlement.productIdentifier.toLowerCase()

    if (productId.includes('yearly') || productId.includes('annual')) {
      plan = 'yearly'
    } else if (productId.includes('monthly')) {
      plan = 'monthly'
    }

    return {
      status: 'premium',
      isPremium: true,
      expiresAt: entitlement.expirationDate ? new Date(entitlement.expirationDate) : null,
      plan,
      willRenew: entitlement.willRenew,
    }
  }, [])

  // Sync subscription to Supabase
  const syncToSupabase = useCallback(async (info: SubscriptionInfo) => {
    if (!userId) return

    try {
      const { error: upsertError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          status: info.isPremium ? 'active' : 'free',
          plan: info.plan,
          expires_at: info.expiresAt?.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })

      if (upsertError) {
        console.error('Failed to sync subscription to Supabase:', upsertError)
      }
    } catch (err) {
      console.error('Error syncing subscription:', err)
    }
  }, [userId])

  // Fetch customer info and packages
  const refreshSubscription = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      // Get customer info
      const customerInfo = await Purchases.getCustomerInfo()
      const info = parseCustomerInfo(customerInfo)
      setSubscriptionInfo(info)

      // Sync to Supabase
      await syncToSupabase(info)

      // Get available packages
      const offerings = await Purchases.getOfferings()
      console.log('[RevenueCat] Offerings response:', JSON.stringify({
        current: offerings.current?.identifier,
        hasPackages: !!offerings.current?.availablePackages,
        packageCount: offerings.current?.availablePackages?.length || 0,
        allOfferings: Object.keys(offerings.all || {}),
        // Debug: Show all offerings and their packages
        allOfferingsDetail: Object.entries(offerings.all || {}).map(([id, offering]) => ({
          id,
          packageCount: offering.availablePackages?.length || 0,
          packages: offering.availablePackages?.map(p => p.identifier),
        })),
      }, null, 2))

      if (offerings.current?.availablePackages) {
        console.log('[RevenueCat] Packages:', offerings.current.availablePackages.map(p => ({
          id: p.identifier,
          product: p.product.identifier,
          price: p.product.priceString,
        })))
        setPackages(offerings.current.availablePackages)
      } else {
        // Try to find any offering with packages
        const offeringsWithPackages = Object.values(offerings.all || {}).find(
          offering => offering.availablePackages && offering.availablePackages.length > 0
        )
        if (offeringsWithPackages) {
          console.log('[RevenueCat] Found packages in non-current offering:', offeringsWithPackages.identifier)
          setPackages(offeringsWithPackages.availablePackages)
        } else {
          console.warn('[RevenueCat] No packages available in any offering. Please check RevenueCat dashboard:')
          console.warn('1. Ensure products are added (com.mandaact.sub.premium.monthly, com.mandaact.sub.premium.yearly)')
          console.warn('2. Create an Offering and set it as "Current"')
          console.warn('3. Add packages (Monthly, Yearly) to the Offering')
        }
      }
    } catch (err) {
      console.error('Failed to refresh subscription:', err)
      setError('구독 정보를 불러오는데 실패했습니다')

      // Fallback: check Supabase directly
      try {
        const { data } = await supabase
          .from('user_subscriptions')
          .select('status, plan, expires_at')
          .eq('user_id', userId)
          .single()

        if (data) {
          setSubscriptionInfo({
            status: data.status === 'active' ? 'premium' : 'free',
            isPremium: data.status === 'active',
            expiresAt: data.expires_at ? new Date(data.expires_at) : null,
            plan: data.plan,
            willRenew: false,
          })
        }
      } catch {
        // Ignore fallback errors
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, parseCustomerInfo, syncToSupabase])

  // Purchase a package
  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const { customerInfo } = await Purchases.purchasePackage(pkg)
      const info = parseCustomerInfo(customerInfo)
      setSubscriptionInfo(info)

      // Sync to Supabase
      await syncToSupabase(info)

      return info.isPremium
    } catch (err: unknown) {
      const purchaseError = err as { userCancelled?: boolean; message?: string }

      if (purchaseError.userCancelled) {
        // User cancelled, not an error
        return false
      }

      console.error('Purchase failed:', err)
      setError('구매에 실패했습니다. 다시 시도해주세요.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [parseCustomerInfo, syncToSupabase])

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const customerInfo = await Purchases.restorePurchases()
      const info = parseCustomerInfo(customerInfo)
      setSubscriptionInfo(info)

      // Sync to Supabase
      await syncToSupabase(info)

      return info.isPremium
    } catch (err) {
      console.error('Restore failed:', err)
      setError('구매 복원에 실패했습니다.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [parseCustomerInfo, syncToSupabase])

  // Check if user can create more mandalarts
  const canCreateMandalart = useCallback((currentCount: number): boolean => {
    if (subscriptionInfo.isPremium) return true
    return currentCount < FREE_MANDALART_LIMIT
  }, [subscriptionInfo.isPremium])

  // Check if user can generate more reports this week
  const canGenerateReport = useCallback((weeklyCount: number): boolean => {
    if (subscriptionInfo.isPremium) return true
    return weeklyCount < FREE_WEEKLY_REPORT_LIMIT
  }, [subscriptionInfo.isPremium])

  // Initialize on mount
  useEffect(() => {
    if (userId) {
      initializeRevenueCat(userId).then(() => {
        refreshSubscription()
      })
    }
  }, [userId, refreshSubscription])

  // Listen for customer info updates
  useEffect(() => {
    const listener = (info: CustomerInfo) => {
      const subscriptionData = parseCustomerInfo(info)
      setSubscriptionInfo(subscriptionData)
      syncToSupabase(subscriptionData)
    }

    Purchases.addCustomerInfoUpdateListener(listener)

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener)
    }
  }, [parseCustomerInfo, syncToSupabase])

  return {
    subscriptionInfo,
    isLoading,
    error,
    packages,
    purchase,
    restore,
    refreshSubscription,
    canCreateMandalart,
    canGenerateReport,
  }
}

// Export entitlement check helper
export function hasActiveEntitlement(entitlements: { [key: string]: PurchasesEntitlementInfo }): boolean {
  return PREMIUM_ENTITLEMENT_ID in entitlements
}
