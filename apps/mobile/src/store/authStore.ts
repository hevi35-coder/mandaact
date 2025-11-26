import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,

      signIn: async (email, password) => {
        set({ loading: true })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) throw error
          set({ user: data.user })
        } finally {
          set({ loading: false })
        }
      },

      signUp: async (email, password) => {
        set({ loading: true })
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          })
          if (error) throw error
          set({ user: data.user })
        } finally {
          set({ loading: false })
        }
      },

      signOut: async () => {
        set({ loading: true })
        try {
          await supabase.auth.signOut()
          set({ user: null })
        } finally {
          set({ loading: false })
        }
      },

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          set({ user: session?.user ?? null, initialized: true })

          // Subscribe to auth state changes
          supabase.auth.onAuthStateChange((_event, session) => {
            set({ user: session?.user ?? null })
          })
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ initialized: true })
        }
      },
    }),
    {
      name: 'mandaact-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
)
