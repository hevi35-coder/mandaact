import React, { createContext, useContext, ReactNode } from 'react'
import { PurchasesPackage, PurchasesStoreProduct } from 'react-native-purchases'
import {
  useSubscription,
  SubscriptionInfo,
  FREE_MANDALART_LIMIT,
  FREE_WEEKLY_REPORT_LIMIT,
} from '../hooks/useSubscription'
import { useAuthStore } from '../store/authStore'

export { FREE_MANDALART_LIMIT, FREE_WEEKLY_REPORT_LIMIT }

interface SubscriptionContextValue {
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

  // Convenience getters
  isPremium: boolean
  isFreeTier: boolean
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

interface SubscriptionProviderProps {
  children: ReactNode
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user } = useAuthStore()

  const {
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
  } = useSubscription(user?.id)

  const value: SubscriptionContextValue = {
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
    isPremium: subscriptionInfo.isPremium,
    isFreeTier: !subscriptionInfo.isPremium,
  }

  console.log('[SubscriptionContext] 📦 Context value updated:', {
    isPremium: value.isPremium,
    isFreeTier: value.isFreeTier,
    status: subscriptionInfo.status,
    isLoading,
  })

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext)

  if (!context) {
    throw new Error(
      'useSubscriptionContext must be used within a SubscriptionProvider'
    )
  }

  return context
}

// Optional: Safe hook that returns null if outside provider (for conditional usage)
export function useSubscriptionContextSafe(): SubscriptionContextValue | null {
  return useContext(SubscriptionContext)
}
