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
import i18n from '../i18n'

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
  const [isRevenueCatInitialized, setIsRevenueCatInitialized] = useState(false)

  // Parse customer info to subscription info
  const parseCustomerInfo = useCallback((customerInfo: CustomerInfo): SubscriptionInfo => {
    console.log('[useSubscription] 🔍 parseCustomerInfo - Raw data:', {
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
      allEntitlements: Object.keys(customerInfo.entitlements.all),
      hasPremiumEntitlement: PREMIUM_ENTITLEMENT_ID in customerInfo.entitlements.active,
      activeSubscriptions: customerInfo.activeSubscriptions,
    })

    const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]

    if (!entitlement) {
      // Fallback: treat active subscriptions without entitlements as premium.
      // This handles cases where the entitlement mapping is missing in RevenueCat dashboard,
      // but the sandbox receipt is still active (common when testing new products).
      const fallbackProductId = customerInfo.activeSubscriptions?.[0]
      if (fallbackProductId) {
        const normalizedId = fallbackProductId.toLowerCase()
        const fallbackPlan: 'monthly' | 'yearly' | null =
          normalizedId.includes('year') || normalizedId.includes('annual')
            ? 'yearly'
            : normalizedId.includes('month')
              ? 'monthly'
              : null

        console.log('[useSubscription] ⚠️ No entitlement, but active subscription detected → PREMIUM (fallback)', {
          fallbackProductId,
          fallbackPlan,
          latestExpirationDate: customerInfo.latestExpirationDate,
        })

        return {
          status: 'premium',
          isPremium: true,
          expiresAt: customerInfo.latestExpirationDate
            ? new Date(customerInfo.latestExpirationDate)
            : null,
          plan: fallbackPlan,
          // Assume renews while active; RevenueCat will correct on next refresh when entitlements are fixed
          willRenew: true,
        }
      }

      console.log('[useSubscription] ❌ No active premium entitlement found → FREE')
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

    const result = {
      status: 'premium' as const,
      isPremium: true,
      expiresAt: entitlement.expirationDate ? new Date(entitlement.expirationDate) : null,
      plan,
      willRenew: entitlement.willRenew,
    }

    console.log('[useSubscription] ✅ Premium entitlement found → PREMIUM', {
      productId: entitlement.productIdentifier,
      plan,
      expiresAt: result.expiresAt?.toISOString(),
      willRenew: result.willRenew,
    })

    return result
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
      setError(i18n.t('errors.generic'))

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

      console.log('[useSubscription] 💳 Starting purchase:', pkg.identifier)
      const { customerInfo } = await Purchases.purchasePackage(pkg)
      console.log('[useSubscription] 💳 Purchase completed, parsing customer info...')

      // Force-refresh to avoid cached customer info immediately after purchase
      await Purchases.invalidateCustomerInfoCache()
      const latestInfo = await Purchases.getCustomerInfo()

      const info = parseCustomerInfo(latestInfo)
      setSubscriptionInfo(info)

      console.log('[useSubscription] 💳 Updated subscription state:', {
        isPremium: info.isPremium,
        status: info.status,
        plan: info.plan,
      })

      // Sync to Supabase
      await syncToSupabase(info)
      console.log('[useSubscription] 💳 Synced to Supabase')

      // CRITICAL: Sandbox environment needs additional time for receipt validation
      // Wait 1.5 seconds and re-check subscription status to ensure it's fully updated
      console.log('[useSubscription] 💳 Waiting for sandbox receipt validation...')
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Re-fetch customer info after delay
      await Purchases.invalidateCustomerInfoCache()
      const finalInfo = await Purchases.getCustomerInfo()
      const finalSubscriptionInfo = parseCustomerInfo(finalInfo)
      setSubscriptionInfo(finalSubscriptionInfo)
      await syncToSupabase(finalSubscriptionInfo)

      console.log('[useSubscription] 💳 Final subscription state after re-check:', {
        isPremium: finalSubscriptionInfo.isPremium,
        status: finalSubscriptionInfo.status,
        plan: finalSubscriptionInfo.plan,
      })

      return finalSubscriptionInfo.isPremium
    } catch (err: unknown) {
      const purchaseError = err as { userCancelled?: boolean; message?: string }

      if (purchaseError.userCancelled) {
        console.log('[useSubscription] 💳 Purchase cancelled by user')
        // User cancelled, not an error
        return false
      }

      console.error('[useSubscription] 💳 Purchase failed:', err)
      setError(i18n.t('subscription.purchaseError'))
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

      console.log('[useSubscription] 🔄 Starting restore purchases...')
      const customerInfo = await Purchases.restorePurchases()
      // Force-refresh to make sure restored receipts are processed
      await Purchases.invalidateCustomerInfoCache()
      const latestInfo = await Purchases.getCustomerInfo()
      const info = parseCustomerInfo(latestInfo)
      setSubscriptionInfo(info)

      console.log('[useSubscription] 🔄 Restore initial result:', {
        isPremium: info.isPremium,
        status: info.status,
        plan: info.plan,
      })

      // Sync to Supabase
      await syncToSupabase(info)

      // CRITICAL: Similar to purchase, wait for sandbox receipt validation
      console.log('[useSubscription] 🔄 Waiting for sandbox receipt validation...')
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Re-fetch customer info after delay
      await Purchases.invalidateCustomerInfoCache()
      const finalInfo = await Purchases.getCustomerInfo()
      const finalSubscriptionInfo = parseCustomerInfo(finalInfo)
      setSubscriptionInfo(finalSubscriptionInfo)
      await syncToSupabase(finalSubscriptionInfo)

      console.log('[useSubscription] 🔄 Final restore result after re-check:', {
        isPremium: finalSubscriptionInfo.isPremium,
        status: finalSubscriptionInfo.status,
        plan: finalSubscriptionInfo.plan,
      })

      return finalSubscriptionInfo.isPremium
    } catch (err) {
      console.error('[useSubscription] 🔄 Restore failed:', err)
      setError(i18n.t('subscription.restoreError'))
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
    if (!userId) return

    let mounted = true

    const initialize = async () => {
      console.log('[useSubscription] 🚀 Initializing for user:', userId)

      // Reset initialization state when user changes
      setIsRevenueCatInitialized(false)
      setIsLoading(true)

      try {
        // Step 1: Load from Supabase first (faster, cached)
        console.log('[useSubscription] 📦 Loading subscription from Supabase...')
        const { data: supabaseData } = await supabase
          .from('user_subscriptions')
          .select('status, plan, expires_at')
          .eq('user_id', userId)
          .single()

        if (supabaseData && mounted) {
          const fallbackInfo: SubscriptionInfo = {
            status: supabaseData.status === 'active' ? 'premium' : 'free',
            isPremium: supabaseData.status === 'active',
            expiresAt: supabaseData.expires_at ? new Date(supabaseData.expires_at) : null,
            plan: supabaseData.plan,
            willRenew: false,
          }
          console.log('[useSubscription] 📦 Loaded from Supabase:', fallbackInfo)
          setSubscriptionInfo(fallbackInfo)
        }

        // Step 2: Initialize RevenueCat
        console.log('[useSubscription] 🔧 Initializing RevenueCat...')
        await initializeRevenueCat(userId)

        if (!mounted) return

        setIsRevenueCatInitialized(true)

        // Step 3: Refresh from RevenueCat (source of truth)
        console.log('[useSubscription] 🔄 Refreshing from RevenueCat...')
        const customerInfo = await Purchases.getCustomerInfo()
        const info = parseCustomerInfo(customerInfo)

        if (mounted) {
          setSubscriptionInfo(info)
          await syncToSupabase(info)
        }

        // Step 4: Load available packages
        console.log('[useSubscription] 📦 Loading packages...')
        const offerings = await Purchases.getOfferings()
        console.log('[useSubscription] 📦 Offerings loaded:', {
          currentOffering: offerings.current?.identifier,
          packageCount: offerings.current?.availablePackages?.length || 0,
        })

        if (mounted) {
          let loadedPackagesCount = 0
          const currentPackages = offerings.current?.availablePackages ?? null
          if (currentPackages && currentPackages.length > 0) {
            setPackages(currentPackages)
            loadedPackagesCount = currentPackages.length
            console.log('[useSubscription] ✅ Packages loaded:', loadedPackagesCount)
          } else {
            // Try to find any offering with packages
            const offeringsWithPackages = Object.values(offerings.all || {}).find(
              offering => offering.availablePackages && offering.availablePackages.length > 0
            )
            if (offeringsWithPackages) {
              console.log('[useSubscription] 📦 Found packages in non-current offering:', offeringsWithPackages.identifier)
              const fallbackPackages = offeringsWithPackages.availablePackages
              setPackages(fallbackPackages)
              loadedPackagesCount = fallbackPackages.length
              console.log('[useSubscription] ✅ Packages loaded (fallback):', loadedPackagesCount)
            } else {
              console.warn('[useSubscription] ⚠️ No packages available in any offering')
              setPackages([])
            }
          }

          console.log('[useSubscription] ✅ Initialization complete:', {
            isPremium: info.isPremium,
            status: info.status,
            packagesCount: loadedPackagesCount,
          })
        }
      } catch (error) {
        console.error('[useSubscription] ❌ Initialization error:', error)
        if (mounted) {
          setError(i18n.t('errors.generic'))
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initialize()

    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]) // Only depend on userId, not refreshSubscription

  // Listen for customer info updates
  useEffect(() => {
    if (!userId || !isRevenueCatInitialized) return

    const listener = (info: CustomerInfo) => {
      console.log('[useSubscription] 🔔 Customer info updated (listener triggered)')
      const subscriptionData = parseCustomerInfo(info)
      setSubscriptionInfo(subscriptionData)
      syncToSupabase(subscriptionData)
      console.log('[useSubscription] 🔔 State updated from listener:', {
        isPremium: subscriptionData.isPremium,
        status: subscriptionData.status,
      })
    }

    Purchases.addCustomerInfoUpdateListener(listener)
    console.log('[useSubscription] 👂 Customer info update listener registered')

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener)
      console.log('[useSubscription] 👂 Customer info update listener removed')
    }
  }, [userId, isRevenueCatInitialized, parseCustomerInfo, syncToSupabase])

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
