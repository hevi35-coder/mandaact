import { useState, useEffect, useCallback, useRef } from 'react'
import Purchases, {
  PurchasesPackage,
  PurchasesStoreProduct,
  CustomerInfo,
  LOG_LEVEL,
  PurchasesEntitlementInfo,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import Constants from 'expo-constants'
import i18n from '../i18n'
import {
  trackPurchaseStarted,
  trackPurchaseSuccess,
  trackPurchaseFailed,
  trackRestoreStarted,
  trackRestoreSuccess,
  trackRestoreFailed,
  trackPremiumStateChanged,
  logger,
} from '../lib'

// RevenueCat API Keys (from environment variables)
const REVENUECAT_IOS_API_KEY = Constants.expoConfig?.extra?.revenuecatIosApiKey || ''
const REVENUECAT_ANDROID_API_KEY = Constants.expoConfig?.extra?.revenuecatAndroidApiKey || ''

// Entitlement ID (configured in RevenueCat dashboard)
const PREMIUM_ENTITLEMENT_ID = 'premium'
const AUTO_RESTORE_COOLDOWN_MS = 6 * 60 * 60 * 1000 // 6 hours
const getAutoRestoreKey = (userId: string) => `@rc_auto_restore_ts:${userId}`

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

function isPurchasesPackage(
  value: PurchasesPackage | PurchasesStoreProduct
): value is PurchasesPackage {
  return 'product' in value
}

let rcConfigurePromise: Promise<boolean> | null = null
let rcIdentityPromise: Promise<boolean> | null = null
let rcLastAppUserId: string | null = null

function isPurchasesErrorCode(value: string | undefined): value is PURCHASES_ERROR_CODE {
  if (!value) return false
  return (Object.values(PURCHASES_ERROR_CODE) as string[]).includes(value)
}

async function configureRevenueCatOnce(): Promise<boolean> {
  if (rcConfigurePromise) return rcConfigurePromise

  rcConfigurePromise = (async () => {
    try {
      const alreadyConfigured = await Purchases.isConfigured()
      if (alreadyConfigured) return true

      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY
      if (!apiKey) return false

      await Purchases.configure({ apiKey })
      return true
    } catch (err) {
      console.error('[RevenueCat] configure failed:', err)
      return false
    }
  })()

  return rcConfigurePromise
}

async function ensureRevenueCatIdentity(userId?: string): Promise<boolean> {
  if (rcIdentityPromise) return rcIdentityPromise

  rcIdentityPromise = (async () => {
    const configured = await configureRevenueCatOnce()
    if (!configured) return false

    try {
      // Best-effort bootstrap of cached identity across app restarts.
      if (rcLastAppUserId === null) {
        const current = await Purchases.getAppUserID()
        rcLastAppUserId = current.startsWith('$RCAnonymousID:') ? null : current
      }

      // Avoid repeated logIn/logOut calls which can cause receipt / identity issues.
      if (userId) {
        if (rcLastAppUserId !== userId) {
          await Purchases.logIn(userId)
          rcLastAppUserId = userId
        }
      } else if (rcLastAppUserId !== null) {
        await Purchases.logOut()
        rcLastAppUserId = null
      }
      return true
    } catch (err) {
      console.error('[RevenueCat] identity sync failed:', err)
      // Still consider SDK usable even if identity sync fails (e.g. transient network error).
      return true
    } finally {
      // Allow subsequent identity changes.
      rcIdentityPromise = null
    }
  })()

  return rcIdentityPromise
}

function getPurchaseErrorDetails(err: unknown): {
  code?: string
  message?: string
  underlyingCode?: string
  underlyingMessage?: string
} {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>
    const code = record.code
    const readableErrorCode = record.readableErrorCode
    const message = record.message
    const underlyingErrorMessage = record.underlyingErrorMessage
    const underlyingErrorCode = record.underlyingErrorCode

    const codeString =
      typeof readableErrorCode === 'string'
        ? readableErrorCode
        : typeof code === 'string' || typeof code === 'number'
          ? String(code)
          : undefined

    const underlyingCodeString =
      typeof underlyingErrorCode === 'string' || typeof underlyingErrorCode === 'number'
        ? String(underlyingErrorCode)
        : undefined

    const underlyingMessageString =
      typeof underlyingErrorMessage === 'string' ? underlyingErrorMessage : undefined

    const messageString =
      underlyingMessageString ??
      (typeof message === 'string' ? message : undefined)

    return {
      code: codeString,
      message: messageString,
      underlyingCode: underlyingCodeString,
      underlyingMessage: underlyingMessageString,
    }
  }

  if (err instanceof Error) return { message: err.message }
  return { message: String(err) }
}

type IapErrorCategory =
  | 'cancelled'
  | 'network'
  | 'store_problem'
  | 'not_allowed'
  | 'payment_pending'
  | 'product_unavailable'
  | 'receipt'
  | 'unknown'

type IapStage =
  | 'init'
  | 'purchase_start'
  | 'purchase_call'
  | 'invalidate_customer_info_cache'
  | 'get_customer_info'
  | 'apply_subscription'
  | 'sync_supabase'
  | 'wait_validation'
  | 'final_get_customer_info'
  | 'restore_start'
  | 'restore_call'

function categorizePurchasesError(
  purchasesErrorCode: PURCHASES_ERROR_CODE | undefined
): IapErrorCategory {
  switch (purchasesErrorCode) {
    case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
      return 'cancelled'
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
    case PURCHASES_ERROR_CODE.API_ENDPOINT_BLOCKED:
      return 'network'
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
    case PURCHASES_ERROR_CODE.UNEXPECTED_BACKEND_RESPONSE_ERROR:
    case PURCHASES_ERROR_CODE.UNKNOWN_BACKEND_ERROR:
    case PURCHASES_ERROR_CODE.CUSTOMER_INFO_ERROR:
    case PURCHASES_ERROR_CODE.SYSTEM_INFO_ERROR:
    case PURCHASES_ERROR_CODE.CONFIGURATION_ERROR:
      return 'store_problem'
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return 'not_allowed'
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return 'payment_pending'
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
    case PURCHASES_ERROR_CODE.PRODUCT_REQUEST_TIMED_OUT_ERROR:
      return 'product_unavailable'
    case PURCHASES_ERROR_CODE.INVALID_RECEIPT_ERROR:
    case PURCHASES_ERROR_CODE.MISSING_RECEIPT_FILE_ERROR:
      return 'receipt'
    default:
      return 'unknown'
  }
}

function getUserMessageForCategory(category: IapErrorCategory): string | null {
  switch (category) {
    case 'network':
      return i18n.t('subscription.networkError')
    case 'store_problem':
      return i18n.t('subscription.storeProblemError')
    case 'not_allowed':
      return i18n.t('subscription.notAllowedError')
    case 'payment_pending':
      return i18n.t('subscription.paymentPendingError')
    case 'receipt':
      return i18n.t('subscription.invalidReceiptError')
    default:
      return null
  }
}

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
  storeProducts: PurchasesStoreProduct[]

  // Actions
  purchase: (plan: PurchasesPackage | PurchasesStoreProduct) => Promise<boolean>
  restore: () => Promise<boolean>
  refreshSubscription: () => Promise<void>

  // Limit checks
  canCreateMandalart: (currentCount: number) => boolean
  canGenerateReport: (weeklyCount: number) => boolean
}

// Initialize RevenueCat (call once at app startup)
export async function initializeRevenueCat(userId?: string): Promise<boolean> {
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
      return false
    }

    const ok = await ensureRevenueCatIdentity(userId)
    console.log('[RevenueCat] Successfully initialized for user:', userId)
    return ok
  } catch (error) {
    console.error('[RevenueCat] Failed to initialize:', error)
    return false
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
  const lastTrackedSubscriptionRef = useRef<SubscriptionInfo>({
    status: 'loading',
    isPremium: false,
    expiresAt: null,
    plan: null,
    willRenew: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [packages, setPackages] = useState<PurchasesPackage[]>([])
  const [storeProducts, setStoreProducts] = useState<PurchasesStoreProduct[]>([])
  const [isRevenueCatInitialized, setIsRevenueCatInitialized] = useState(false)

  const loadFallbackProducts = useCallback(async (): Promise<PurchasesStoreProduct[]> => {
    try {
      const products = await Purchases.getProducts([PRODUCT_IDS.MONTHLY, PRODUCT_IDS.YEARLY])
      return products
    } catch (err) {
      console.warn('[useSubscription] ⚠️ Failed to load fallback store products:', err)
      return []
    }
  }, [])

  const loadPlansWithRetry = useCallback(async (): Promise<{
    packages: PurchasesPackage[]
    storeProducts: PurchasesStoreProduct[]
    source: 'current_offering' | 'fallback_offering' | 'store_products' | 'none'
  }> => {
    const loadOnce = async () => {
      const offerings = await Purchases.getOfferings()

      const currentPackages = offerings.current?.availablePackages ?? []
      if (currentPackages.length > 0) {
        return {
          packages: currentPackages,
          storeProducts: [],
          source: 'current_offering' as const,
        }
      }

      const offeringsWithPackages = Object.values(offerings.all || {}).find(
        (offering) => (offering.availablePackages?.length ?? 0) > 0
      )
      if (offeringsWithPackages) {
        return {
          packages: offeringsWithPackages.availablePackages,
          storeProducts: [],
          source: 'fallback_offering' as const,
        }
      }

      const products = await loadFallbackProducts()
      if (products.length > 0) {
        return {
          packages: [],
          storeProducts: products,
          source: 'store_products' as const,
        }
      }

      return { packages: [], storeProducts: [], source: 'none' as const }
    }

    const retryDelaysMs = [0, 1200, 3000] // StoreKit/Offerings propagation can be delayed
    let lastResult: Awaited<ReturnType<typeof loadOnce>> | null = null

    for (const delayMs of retryDelaysMs) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
      lastResult = await loadOnce()
      if (lastResult.source !== 'none') return lastResult
    }

    return lastResult ?? { packages: [], storeProducts: [], source: 'none' }
  }, [loadFallbackProducts])

  const applySubscriptionInfo = useCallback((
    nextInfo: SubscriptionInfo,
    reason?: Parameters<typeof trackPremiumStateChanged>[0]['reason']
  ) => {
    const prevInfo = lastTrackedSubscriptionRef.current
    if (reason && prevInfo.status !== nextInfo.status) {
      trackPremiumStateChanged({
        from: prevInfo.status,
        to: nextInfo.isPremium ? 'premium' : 'free',
        reason,
        plan: nextInfo.plan,
      })
    }
    lastTrackedSubscriptionRef.current = nextInfo
    setSubscriptionInfo(nextInfo)
  }, [])

  // Parse customer info to subscription info (+ reason)
  const parseCustomerInfo = useCallback((customerInfo: CustomerInfo): {
    info: SubscriptionInfo
    reason: 'rc_entitlement' | 'rc_active_subscription_fallback'
  } => {
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
          reason: 'rc_active_subscription_fallback',
          info: {
            status: 'premium',
            isPremium: true,
            expiresAt: customerInfo.latestExpirationDate
              ? new Date(customerInfo.latestExpirationDate)
              : null,
            plan: fallbackPlan,
            // Assume renews while active; RevenueCat will correct on next refresh when entitlements are fixed
            willRenew: true,
          },
        }
      }

      console.log('[useSubscription] ❌ No active premium entitlement found → FREE')
      return {
        reason: 'rc_entitlement',
        info: {
          status: 'free',
          isPremium: false,
          expiresAt: null,
          plan: null,
          willRenew: false,
        },
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

    return { reason: 'rc_entitlement', info: result }
  }, [])

  // Sync subscription to Supabase
  const syncToSupabase = useCallback(async (info: SubscriptionInfo) => {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') return

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
    setIsLoading(true)
    setError(null)

    try {
      if (!isRevenueCatInitialized) {
        const configured = await initializeRevenueCat(userId)
        setIsRevenueCatInitialized(configured)
        if (!configured) {
          setPackages([])
          setStoreProducts([])
          setError(i18n.t('errors.unknown', { defaultValue: 'Something went wrong. Please try again.' }))
          return
        }
      }

      // Get customer info
      const customerInfo = await Purchases.getCustomerInfo()
      const parsed = parseCustomerInfo(customerInfo)
      applySubscriptionInfo(parsed.info, parsed.reason)

      // Sync to Supabase
      if (userId) {
        await syncToSupabase(parsed.info)
      }

      // Get available packages (Offerings) with a small retry to handle transient StoreKit delays.
      const planLoad = await loadPlansWithRetry()
      console.log('[useSubscription] 📦 Plans loaded:', {
        source: planLoad.source,
        packagesCount: planLoad.packages.length,
        storeProductsCount: planLoad.storeProducts.length,
      })
      setPackages(planLoad.packages)
      setStoreProducts(planLoad.storeProducts)
    } catch (err) {
      console.error('Failed to refresh subscription:', err)
      setError(i18n.t('errors.unknown', { defaultValue: 'Something went wrong. Please try again.' }))

      // Fallback: check Supabase directly
      try {
        if (!userId) return

        const { data } = await supabase
          .from('user_subscriptions')
          .select('status, plan, expires_at')
          .eq('user_id', userId)
          .single()

        if (data) {
          applySubscriptionInfo({
            status: data.status === 'active' ? 'premium' : 'free',
            isPremium: data.status === 'active',
            expiresAt: data.expires_at ? new Date(data.expires_at) : null,
            plan: data.plan,
            willRenew: false,
          }, 'supabase_fallback')
        }
      } catch {
        // Ignore fallback errors
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, isRevenueCatInitialized, parseCustomerInfo, syncToSupabase, applySubscriptionInfo, loadPlansWithRetry])

  // Purchase a plan (RevenueCat package preferred; StoreKit product fallback)
  const purchase = useCallback(async (plan: PurchasesPackage | PurchasesStoreProduct): Promise<boolean> => {
    let stage: IapStage = 'init'
    try {
      setIsLoading(true)
      setError(null)

      if (!isRevenueCatInitialized) {
        stage = 'init'
        const configured = await initializeRevenueCat(userId)
        setIsRevenueCatInitialized(configured)
        if (!configured) {
          setError(i18n.t('subscription.purchaseError'))
          return false
        }
      }

      const productId = isPurchasesPackage(plan) ? plan.product.identifier : plan.identifier
      const planId = isPurchasesPackage(plan) ? plan.identifier : plan.identifier
      const price = isPurchasesPackage(plan) ? plan.product.price : plan.price
      const currency = isPurchasesPackage(plan) ? plan.product.currencyCode : plan.currencyCode

      console.log('[useSubscription] 💳 Starting purchase:', planId)
      stage = 'purchase_start'
      trackPurchaseStarted({
        product_id: productId,
        package_id: planId,
        price,
        currency,
      })

      stage = 'purchase_call'
      if (isPurchasesPackage(plan)) {
        await Purchases.purchasePackage(plan)
      } else {
        await Purchases.purchaseStoreProduct(plan)
      }
      console.log('[useSubscription] 💳 Purchase completed, parsing customer info...')

      // Force-refresh to avoid cached customer info immediately after purchase
      stage = 'invalidate_customer_info_cache'
      await Purchases.invalidateCustomerInfoCache()
      stage = 'get_customer_info'
      const latestInfo = await Purchases.getCustomerInfo()

      const parsed = parseCustomerInfo(latestInfo)
      stage = 'apply_subscription'
      applySubscriptionInfo(parsed.info, parsed.reason)

      console.log('[useSubscription] 💳 Updated subscription state:', {
        isPremium: parsed.info.isPremium,
        status: parsed.info.status,
        plan: parsed.info.plan,
      })

      // Sync to Supabase (only when signed in)
      if (userId) {
        stage = 'sync_supabase'
        await syncToSupabase(parsed.info)
        console.log('[useSubscription] 💳 Synced to Supabase')
      }

      // CRITICAL: Sandbox environment needs additional time for receipt validation
      // Wait 1.5 seconds and re-check subscription status to ensure it's fully updated
      stage = 'wait_validation'
      console.log('[useSubscription] 💳 Waiting for sandbox receipt validation...')
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Re-fetch customer info after delay
      stage = 'final_get_customer_info'
      await Purchases.invalidateCustomerInfoCache()
      const finalInfo = await Purchases.getCustomerInfo()
      const finalParsed = parseCustomerInfo(finalInfo)
      applySubscriptionInfo(finalParsed.info, finalParsed.reason)
      if (userId) {
        await syncToSupabase(finalParsed.info)
      }

      console.log('[useSubscription] 💳 Final subscription state after re-check:', {
        isPremium: finalParsed.info.isPremium,
        status: finalParsed.info.status,
        plan: finalParsed.info.plan,
      })

      if (finalParsed.info.isPremium) {
        trackPurchaseSuccess({
          product_id: productId,
          plan: finalParsed.info.plan,
          price,
          currency,
        })
      } else {
        trackPurchaseFailed({
          product_id: productId,
          plan: finalParsed.info.plan,
          price,
          currency,
          error_code: 'no_premium_after_purchase',
        })
      }

      return finalParsed.info.isPremium
    } catch (err: unknown) {
      const purchaseError = err as { userCancelled?: boolean; message?: string; code?: string | number }

      if (purchaseError.userCancelled) {
        console.log('[useSubscription] 💳 Purchase cancelled by user')
        // User cancelled, not an error
        return false
      }

      const details = getPurchaseErrorDetails(err)
      const code = typeof details.code === 'string' ? details.code : undefined
      const purchasesErrorCode = isPurchasesErrorCode(code) ? code : undefined
      const category = categorizePurchasesError(purchasesErrorCode)
      const userMessageBase = getUserMessageForCategory(category) ?? i18n.t('subscription.purchaseError')
      const userMessage = code ? `${userMessageBase} (code: ${code})` : userMessageBase

      console.error('[useSubscription] 💳 Purchase failed:', err)
      setError(userMessage)
      logger.captureException(err, {
        scope: 'subscription',
        action: 'purchase',
        product_id: isPurchasesPackage(plan) ? plan.product.identifier : plan.identifier,
        package_id: isPurchasesPackage(plan) ? plan.identifier : plan.identifier,
        error_code: code,
        purchases_error_code: purchasesErrorCode,
        error_message: details.message,
        underlying_error_code: details.underlyingCode,
        underlying_error_message: details.underlyingMessage,
        stage,
        category,
      })
      trackPurchaseFailed({
        product_id: isPurchasesPackage(plan) ? plan.product.identifier : plan.identifier,
        price: isPurchasesPackage(plan) ? plan.product.price : plan.price,
        currency: isPurchasesPackage(plan) ? plan.product.currencyCode : plan.currencyCode,
        error_code: code ?? String(purchaseError.code ?? purchaseError.message ?? 'purchase_failed'),
        purchases_error_code: purchasesErrorCode,
        error_category: category,
        error_stage: stage,
      })
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId, isRevenueCatInitialized, parseCustomerInfo, syncToSupabase, applySubscriptionInfo, isPurchasesPackage])

  // Restore purchases
  const restore = useCallback(async (): Promise<boolean> => {
    let stage: IapStage = 'init'
    try {
      setIsLoading(true)
      setError(null)

      if (!isRevenueCatInitialized) {
        stage = 'init'
        const configured = await initializeRevenueCat(userId)
        setIsRevenueCatInitialized(configured)
        if (!configured) {
          setError(i18n.t('subscription.restoreError'))
          return false
        }
      }

      console.log('[useSubscription] 🔄 Starting restore purchases...')
      stage = 'restore_start'
      trackRestoreStarted({ trigger: 'manual' })
      stage = 'restore_call'
      await Purchases.restorePurchases()
      // Force-refresh to make sure restored receipts are processed
      stage = 'invalidate_customer_info_cache'
      await Purchases.invalidateCustomerInfoCache()
      stage = 'get_customer_info'
      const latestInfo = await Purchases.getCustomerInfo()
      const parsed = parseCustomerInfo(latestInfo)
      stage = 'apply_subscription'
      applySubscriptionInfo(parsed.info, 'restore_manual')

      console.log('[useSubscription] 🔄 Restore initial result:', {
        isPremium: parsed.info.isPremium,
        status: parsed.info.status,
        plan: parsed.info.plan,
      })

      // Sync to Supabase
      if (userId) {
        stage = 'sync_supabase'
        await syncToSupabase(parsed.info)
      }

      // CRITICAL: Similar to purchase, wait for sandbox receipt validation
      stage = 'wait_validation'
      console.log('[useSubscription] 🔄 Waiting for sandbox receipt validation...')
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Re-fetch customer info after delay
      stage = 'final_get_customer_info'
      await Purchases.invalidateCustomerInfoCache()
      const finalInfo = await Purchases.getCustomerInfo()
      const finalParsed = parseCustomerInfo(finalInfo)
      applySubscriptionInfo(finalParsed.info, 'restore_manual')
      if (userId) {
        await syncToSupabase(finalParsed.info)
      }

      console.log('[useSubscription] 🔄 Final restore result after re-check:', {
        isPremium: finalParsed.info.isPremium,
        status: finalParsed.info.status,
        plan: finalParsed.info.plan,
      })

      trackRestoreSuccess({ trigger: 'manual', restored: finalParsed.info.isPremium })
      return finalParsed.info.isPremium
    } catch (err) {
      const details = getPurchaseErrorDetails(err)
      const code = typeof details.code === 'string' ? details.code : undefined
      const purchasesErrorCode = isPurchasesErrorCode(code) ? code : undefined
      const category = categorizePurchasesError(purchasesErrorCode)
      const userMessageBase = getUserMessageForCategory(category) ?? i18n.t('subscription.restoreError')
      const userMessage = code ? `${userMessageBase} (code: ${code})` : userMessageBase
      console.error('[useSubscription] 🔄 Restore failed:', err)
      setError(userMessage)
      logger.captureException(err, {
        scope: 'subscription',
        action: 'restore',
        error_code: code,
        purchases_error_code: purchasesErrorCode,
        error_message: details.message,
        underlying_error_code: details.underlyingCode,
        underlying_error_message: details.underlyingMessage,
        stage,
        category,
      })
      trackRestoreFailed({
        trigger: 'manual',
        error_code: code ?? details.message ?? 'restore_failed',
        purchases_error_code: purchasesErrorCode,
        error_category: category,
        error_stage: stage,
      })
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId, isRevenueCatInitialized, parseCustomerInfo, syncToSupabase, applySubscriptionInfo])

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
    let mounted = true

    const initialize = async () => {
      console.log('[useSubscription] 🚀 Initializing for user:', userId ?? '(anonymous)')

      // Reset initialization state when user changes
      setIsRevenueCatInitialized(false)
      setIsLoading(true)

      try {
        let supabaseFallbackStatus: 'active' | 'free' | null = null

        // Step 1: Load from Supabase first (faster, cached)
        if (userId) {
          console.log('[useSubscription] 📦 Loading subscription from Supabase...')
          const { data: supabaseData } = await supabase
            .from('user_subscriptions')
            .select('status, plan, expires_at')
            .eq('user_id', userId)
            .single()

          if (supabaseData && mounted) {
            supabaseFallbackStatus = supabaseData.status === 'active' ? 'active' : 'free'
            const fallbackInfo: SubscriptionInfo = {
              status: supabaseData.status === 'active' ? 'premium' : 'free',
              isPremium: supabaseData.status === 'active',
              expiresAt: supabaseData.expires_at ? new Date(supabaseData.expires_at) : null,
              plan: supabaseData.plan,
              willRenew: false,
            }
            console.log('[useSubscription] 📦 Loaded from Supabase:', fallbackInfo)
            applySubscriptionInfo(fallbackInfo, 'supabase_fallback')
          }
        }

        // Step 2: Initialize RevenueCat
        console.log('[useSubscription] 🔧 Initializing RevenueCat...')
        const configured = await initializeRevenueCat(userId)

        if (!mounted) return

        setIsRevenueCatInitialized(configured)

        if (!configured) {
          setPackages([])
          setStoreProducts([])
          setError(i18n.t('errors.unknown'))
          return
        }

        // Step 3: Refresh from RevenueCat (source of truth)
        console.log('[useSubscription] 🔄 Refreshing from RevenueCat...')
        await Purchases.invalidateCustomerInfoCache()
        let customerInfo = await Purchases.getCustomerInfo()
        let parsed = parseCustomerInfo(customerInfo)
        let info = parsed.info

        // Auto-restore logic removed to prevent repetitive App Store password prompts.
        // Users must manually tap "Restore Purchases" in Settings if needed.

        if (mounted) {
          applySubscriptionInfo(info, parsed.reason)
          if (userId) {
            await syncToSupabase(info)
          }
        }

        // Step 4: Load available packages (Offerings)
        console.log('[useSubscription] 📦 Loading plans...')
        const planLoad = await loadPlansWithRetry()
        console.log('[useSubscription] 📦 Plans loaded:', {
          source: planLoad.source,
          packagesCount: planLoad.packages.length,
          storeProductsCount: planLoad.storeProducts.length,
        })

        if (mounted) {
          setPackages(planLoad.packages)
          setStoreProducts(planLoad.storeProducts)
          console.log('[useSubscription] ✅ Initialization complete:', {
            isPremium: info.isPremium,
            status: info.status,
            plansSource: planLoad.source,
            packagesCount: planLoad.packages.length,
            storeProductsCount: planLoad.storeProducts.length,
          })
        }
      } catch (error: any) {
        const errorMessage = error?.message || String(error)
        // Ignore network cancellation errors (common during hot reload or background fetch)
        if (errorMessage.toLowerCase().includes('cancelled') || errorMessage.toLowerCase().includes('network error')) {
          console.warn('[useSubscription] ⚠️ Initialization cancelled/network error (ignoring):', errorMessage)
        } else {
          console.error('[useSubscription] ❌ Initialization error:', error)
          if (mounted) {
            setError(i18n.t('errors.unknown', { defaultValue: 'Something went wrong. Please try again.' }))
          }
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
  }, [userId, applySubscriptionInfo, loadPlansWithRetry, parseCustomerInfo, syncToSupabase])

  // Listen for customer info updates
  useEffect(() => {
    if (!userId || !isRevenueCatInitialized) return

    const listener = (info: CustomerInfo) => {
      console.log('[useSubscription] 🔔 Customer info updated (listener triggered)')
      const parsed = parseCustomerInfo(info)
      applySubscriptionInfo(parsed.info, parsed.reason)
      syncToSupabase(parsed.info)
      console.log('[useSubscription] 🔔 State updated from listener:', {
        isPremium: parsed.info.isPremium,
        status: parsed.info.status,
      })
    }

    Purchases.addCustomerInfoUpdateListener(listener)
    console.log('[useSubscription] 👂 Customer info update listener registered')

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener)
      console.log('[useSubscription] 👂 Customer info update listener removed')
    }
  }, [userId, isRevenueCatInitialized, parseCustomerInfo, syncToSupabase, applySubscriptionInfo])

  return {
    subscriptionInfo,
    isLoading,
    error,
    packages,
    storeProducts,
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
