import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeSupabase } from '@mandaact/shared'

// Environment variables from .env
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables')
}

// Initialize Supabase with AsyncStorage for React Native
initializeSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, AsyncStorage)

console.log('Supabase initialized for React Native')
