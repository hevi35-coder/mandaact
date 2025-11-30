import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import { getCurrentLanguage } from '../i18n'

const TIMEZONE_SAVED_KEY = 'user_timezone_saved'

export interface UserProfile {
  user_id: string
  nickname: string | null
  timezone: string
  language: string
  created_at: string
  updated_at: string
}

/**
 * Detect device timezone using Intl API
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    // Fallback to Asia/Seoul if detection fails
    return 'Asia/Seoul'
  }
}

/**
 * Hook to manage user profile with timezone and language
 */
export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        // Profile doesn't exist - will be created on saveTimezone
        if (fetchError.code === 'PGRST116') {
          setProfile(null)
        } else {
          throw fetchError
        }
      } else {
        setProfile(data)
      }
    } catch (err) {
      logger.error('Failed to fetch user profile', err)
      setError('Failed to fetch profile')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Save timezone and language to profile
  const saveTimezoneAndLanguage = useCallback(async (timezone: string, language: string) => {
    if (!userId) return false

    try {
      const { data, error: upsertError } = await supabase.rpc('upsert_user_profile', {
        p_user_id: userId,
        p_timezone: timezone,
        p_language: language,
      })

      if (upsertError) throw upsertError

      setProfile(data)
      await AsyncStorage.setItem(TIMEZONE_SAVED_KEY, 'true')
      logger.info('User profile saved', { timezone, language })
      return true
    } catch (err) {
      logger.error('Failed to save user profile', err)
      return false
    }
  }, [userId])

  // Auto-detect and save timezone on first login
  const autoDetectAndSave = useCallback(async () => {
    if (!userId) return false

    // Check if already saved
    const alreadySaved = await AsyncStorage.getItem(TIMEZONE_SAVED_KEY)
    if (alreadySaved === 'true') {
      return false
    }

    const detectedTimezone = getDeviceTimezone()
    const currentLanguage = getCurrentLanguage()

    logger.info('Auto-detecting timezone', { detectedTimezone, currentLanguage })

    return saveTimezoneAndLanguage(detectedTimezone, currentLanguage)
  }, [userId, saveTimezoneAndLanguage])

  // Update timezone only
  const updateTimezone = useCallback(async (timezone: string) => {
    if (!userId) return false

    try {
      const { data, error: updateError } = await supabase.rpc('upsert_user_profile', {
        p_user_id: userId,
        p_timezone: timezone,
      })

      if (updateError) throw updateError

      setProfile(data)
      return true
    } catch (err) {
      logger.error('Failed to update timezone', err)
      return false
    }
  }, [userId])

  // Update language only
  const updateLanguage = useCallback(async (language: string) => {
    if (!userId) return false

    try {
      const { data, error: updateError } = await supabase.rpc('upsert_user_profile', {
        p_user_id: userId,
        p_language: language,
      })

      if (updateError) throw updateError

      setProfile(data)
      return true
    } catch (err) {
      logger.error('Failed to update language', err)
      return false
    }
  }, [userId])

  // Get user's local "today" date string (YYYY-MM-DD)
  const getUserLocalDate = useCallback((date: Date = new Date()): string => {
    const tz = profile?.timezone || getDeviceTimezone()
    return date.toLocaleDateString('en-CA', { timeZone: tz })
  }, [profile?.timezone])

  // Fetch profile on mount
  useEffect(() => {
    if (userId) {
      fetchProfile()
    }
  }, [userId, fetchProfile])

  return {
    profile,
    isLoading,
    error,
    timezone: profile?.timezone || getDeviceTimezone(),
    language: profile?.language || getCurrentLanguage(),
    fetchProfile,
    saveTimezoneAndLanguage,
    autoDetectAndSave,
    updateTimezone,
    updateLanguage,
    getUserLocalDate,
  }
}

/**
 * Standalone function to get user's timezone from profile or device
 */
export async function getUserTimezone(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('user_id', userId)
      .single()

    if (error || !data?.timezone) {
      return getDeviceTimezone()
    }

    return data.timezone
  } catch {
    return getDeviceTimezone()
  }
}
