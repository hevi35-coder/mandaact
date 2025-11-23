import { create } from 'zustand'
import { getSupabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

const getClient = () => {
  try {
    return getSupabase()
  } catch (error) {
    console.error('Supabase not initialized:', error)
    throw error
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await getClient().auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      set({ session: data.session, user: data.user })
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  },

  signOut: async () => {
    try {
      await getClient().auth.signOut()
      set({ session: null, user: null })
    } catch (error) {
      console.error('Signout error:', error)
    }
  },

  initialize: async () => {
    if (get().initialized) return

    try {
      const { data: { session } } = await getClient().auth.getSession()
      set({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true
      })

      getClient().auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null, loading: false })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ loading: false, initialized: true })
    }
  },
}))
