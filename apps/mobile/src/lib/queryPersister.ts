import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'

/**
 * Create a persister for TanStack Query using AsyncStorage
 * This enables offline data persistence
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
  // Throttle to avoid too frequent writes
  throttleTime: 1000,
})

/**
 * Create a QueryClient with persistence-friendly defaults
 */
export function createPersistableQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep data fresh for 5 minutes
        staleTime: 1000 * 60 * 5,
        // Cache data for 24 hours
        gcTime: 1000 * 60 * 60 * 24,
        // Retry failed requests 3 times
        retry: 3,
        // Refetch on window focus (mobile: app comes to foreground)
        refetchOnWindowFocus: true,
        // Refetch on reconnect
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry mutations 1 time
        retry: 1,
      },
    },
  })
}

/**
 * Get the dehydration settings for persistence
 */
export const persistOptions = {
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  buster: 'v2', // Changed from v1 to invalidate stale cached data
}
