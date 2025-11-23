import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  signUp: (email: string, password: string, nickname?: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),

  setSession: (session) => set({ session, user: session?.user ?? null }),

  signUp: async (email: string, password: string, nickname?: string) => {
    try {
      // Check if nickname is already taken (only if provided)
      if (nickname) {
        const { data: existingNickname } = await supabase
          .from('user_levels')
          .select('nickname')
          .ilike('nickname', nickname)
          .single()

        if (existingNickname) {
          throw new Error('이미 사용 중인 닉네임입니다')
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: nickname ? {
          data: {
            nickname: nickname
          }
        } : undefined
      })

      console.log('Supabase signup response:', { data, error })

      if (error) {
        console.error('Signup error from Supabase:', error)

        // Translate common Supabase errors to Korean
        let message = error.message

        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          message = '이미 가입된 이메일입니다'
        } else if (error.message.includes('invalid email')) {
          message = '유효하지 않은 이메일 형식입니다'
        } else if (error.message.includes('Password should be')) {
          message = '비밀번호는 최소 6자 이상이어야 합니다'
        } else if (error.message.includes('rate limit')) {
          message = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요'
        }

        throw new Error(message)
      }

      // When email confirmation is enabled, Supabase returns user but no session
      // Check if this is a duplicate signup attempt
      if (data.user && !data.session) {
        console.log('User created but no session (email confirmation required)')
        console.log('User identities:', data.user.identities)

        // If identities array is empty, this is likely a duplicate email
        if (data.user.identities && data.user.identities.length === 0) {
          throw new Error('이미 가입된 이메일입니다')
        }

        // Create user_levels record for new users
        // (even though they don't have a session yet)
        if (data.user.id) {
          await supabase
            .from('user_levels')
            .insert({
              user_id: data.user.id,
              nickname: nickname || null,
              level: 1,
              total_xp: 0
            })
        }
      }

      if (data.session) {
        set({ session: data.session, user: data.user })

        // Create user_levels record
        if (data.user) {
          await supabase
            .from('user_levels')
            .insert({
              user_id: data.user.id,
              nickname: nickname || null,
              level: 1,
              total_xp: 0
            })
        }
      }

      return { error: null }
    } catch (error) {
      console.error('Signup error (final catch):', error)
      return { error: error as Error }
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Signin error from Supabase:', error)

        // Translate common Supabase errors to Korean
        let message = error.message

        if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid credentials')) {
          message = '이메일 또는 비밀번호가 올바르지 않습니다'
        } else if (error.message.includes('Email not confirmed')) {
          message = '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요'
        } else if (error.message.includes('invalid email')) {
          message = '유효하지 않은 이메일 형식입니다'
        } else if (error.message.includes('rate limit')) {
          message = '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요'
        }

        throw new Error(message)
      }

      set({ session: data.session, user: data.user })
      return { error: null }
    } catch (error) {
      console.error('Signin error (final catch):', error)
      return { error: error as Error }
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
      set({ session: null, user: null })
    } catch (error) {
      console.error('Signout error:', error)
    }
  },

  initialize: async () => {
    if (get().initialized) return

    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      set({ session, user: session?.user ?? null, loading: false, initialized: true })

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null, loading: false })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ loading: false, initialized: true })
    }
  },
}))
