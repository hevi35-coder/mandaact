import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Platform detection
export const isReactNative = typeof navigator !== 'undefined' &&
  navigator.product === 'ReactNative'

// Global instance
let supabaseInstance: SupabaseClient | null = null

export const initializeSupabase = (
  url: string,
  key: string,
  storage?: any
): SupabaseClient => {
  if (supabaseInstance) {
    console.warn('Supabase already initialized')
    return supabaseInstance
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: !isReactNative,
      storage: storage,
    },
  })

  return supabaseInstance
}

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized. Call initializeSupabase() first.')
  }
  return supabaseInstance
}
