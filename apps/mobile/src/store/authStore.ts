import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { logger } from '../lib/logger'
import { useCoachingStore } from './coachingStore'
import { useCoachingAccessStore } from './coachingAccessStore'
import { usePlanStore } from './planStore'
// Google Sign-In (Safe Import for Simulator)
let GoogleSignin: any = {
  configure: () => { },
  hasPlayServices: async () => { },
  signIn: async () => { throw new Error('Google Sign-In not available in simulator without dev client') },
  signOut: async () => { },
}
let statusCodes: any = {}

try {
  const GoogleModule = require('@react-native-google-signin/google-signin')
  GoogleSignin = GoogleModule.GoogleSignin
  statusCodes = GoogleModule.statusCodes

  // Configure Google Sign-In
  GoogleSignin.configure({
    scopes: ['email', 'profile'],
    webClientId: '737355022545-t2220091rj6r2fkq7h4lvgo0dciqp4ne.apps.googleusercontent.com',
    iosClientId: '737355022545-vqbqbbofdbadee4ejc4ek2jrev92mtus.apps.googleusercontent.com',
  })
} catch (e) {
  console.warn('Google Sign-In module not found, using mock. (This is expected in Expo Go/Simulator without dev client)')
}

interface AuthResult {
  user: User | null
  session?: Session | null
}

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  signInWithGoogle: () => Promise<AuthResult>
  signInWithApple: () => Promise<AuthResult>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      user: null,
      loading: false,
      initialized: false,

      signInWithGoogle: async () => {
        set({ loading: true })
        try {
          await GoogleSignin.hasPlayServices()
          const userInfo = await GoogleSignin.signIn()

          if (!userInfo.data?.idToken) throw new Error('No ID token present!')

          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: userInfo.data.idToken,
          })

          if (error) throw error

          set({ user: data.user })
          return { user: data.user, session: data.session }
        } catch (error: any) {
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            // User cancelled the login flow
            return { user: null }
          }
          logger.error('Google Sign-In Error', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signInWithApple: async () => {
        set({ loading: true })
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          })

          // Sign in to Supabase using the identity token
          if (!credential.identityToken) {
            throw new Error('No identity token provided.')
          }

          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
          })

          if (error) throw error

          set({ user: data.user })
          return { user: data.user, session: data.session }
        } catch (error: any) {
          if (error.code === 'ERR_REQUEST_CANCELED') {
            // User cancelled
            return { user: null }
          }
          logger.error('Apple Sign-In Error', error)
          throw error
        } finally {
          set({ loading: false })
        }
      },

      signOut: async () => {
        set({ loading: true })
        try {
          // Clear all user-dependent persisted stores
          useCoachingStore.getState().resetSession()
          useCoachingAccessStore.getState().reset()
          usePlanStore.getState().reset()

          await supabase.auth.signOut()
          try {
            await GoogleSignin.signOut()
          } catch (e) {
            // Ignore if google signout fails (e.g. wasn't signed in with google)
          }
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
          logger.error('Auth initialization error', error)
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
