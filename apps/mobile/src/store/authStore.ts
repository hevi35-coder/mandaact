import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { logger } from '../lib/logger'
import { useCoachingStore } from './coachingStore'
import { useCoachingAccessStore } from './coachingAccessStore'
import { usePlanStore } from './planStore'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto' // Ensure expo-crypto is installed for nonce
// Google Sign-In (Safe Import for Simulator)
let GoogleSignin: any = {
  configure: () => { },
  hasPlayServices: async () => { },
  signIn: async () => { throw new Error('Google Sign-In not available in simulator without dev client') },
  signOut: async () => { },
}
let statusCodes: any = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED_MOCK' // Prevent undefined === undefined false positive
}

try {
  const GoogleModule = require('@react-native-google-signin/google-signin')
  GoogleSignin = GoogleModule.GoogleSignin
  statusCodes = GoogleModule.statusCodes

  // Configure Google Sign-In
  GoogleSignin.configure({
    scopes: ['email', 'profile'],
    webClientId: '737355022545-t2220091rj6r2fkq7h4lvgo0dciqp4ne.apps.googleusercontent.com',
    // iosClientId: Only provided in Dev (Simulator) to prevent crash. In Prod, rely on plist.
    iosClientId: __DEV__ ? '737355022545-vqbqbbofdbadee4ejc4ek2jrev92mtus.apps.googleusercontent.com' : undefined,
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
  signInWithPassword: (email?: string, password?: string) => Promise<void> // For Simulator & Reviewer Access
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
          const csrf = Math.random().toString(36).substring(2, 15)
          const nonce = Math.random().toString(36).substring(2, 10)
          const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            nonce
          )

          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
          })

          // Sign in to Supabase using the identity token
          if (!credential.identityToken) {
            throw new Error('No identity token provided.')
          }

          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken,
            nonce: nonce, // Pass the raw nonce to Supabase to verify the hashed nonce in token
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

      signInWithPassword: async (email?: string, password?: string) => {
        set({ loading: true })
        const TARGET_EMAIL = email || 'dev@mandaact.com'
        const TARGET_PASS = password || 'dev1234!!'

        try {
          // 1. Try Signing In
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: TARGET_EMAIL,
            password: TARGET_PASS,
          })

          if (!signInError && data.user) {
            set({ user: data.user, loading: false })
            return
          }

          // 2. If Sign In failed, and it's NOT the reviewer account, Try Signing Up (for dev convenience)
          if (TARGET_EMAIL === 'dev@mandaact.com') {
            console.log('Dev Sign-In failed, trying Sign-Up...', signInError?.message)
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: TARGET_EMAIL,
              password: TARGET_PASS,
            })

            if (!signUpError && signUpData.user) {
              set({ user: signUpData.user, loading: false })
              Alert.alert('Dev Account Created', 'Created and logged in as dev@mandaact.com')
              return
            }
          }

          if (signInError) throw signInError
        } catch (e: any) {
          console.error('Sign-In Exception:', e)
          Alert.alert('Login Error', e.message || 'Failed to sign in')
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
