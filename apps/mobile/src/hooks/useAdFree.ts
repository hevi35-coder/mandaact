/**
 * useAdFree Hook
 *
 * Manages Ad-Free Time (Focus Mode) state.
 * Users can watch a rewarded ad to get 24 hours of banner-free experience.
 *
 * @see ADMOB_MONETIZATION_STRATEGY.md Section 3.1
 */

import { useState, useEffect, useCallback } from 'react'
import {
  isAdFreeActive,
  getAdFreeRemainingTime,
  activateAdFree,
} from '../lib/ads'

interface UseAdFreeReturn {
  /** Whether Ad-Free mode is currently active */
  isAdFree: boolean
  /** Remaining time in milliseconds */
  remainingTime: number
  /** Remaining time formatted as "HH:MM" */
  remainingTimeFormatted: string
  /** Loading state */
  isLoading: boolean
  /** Activate Ad-Free mode (call after rewarded ad completion) */
  activate: () => Promise<Date>
  /** Refresh the Ad-Free status */
  refresh: () => Promise<void>
}

export function useAdFree(): UseAdFreeReturn {
  const [isAdFree, setIsAdFree] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Format remaining time as "HH:MM" or "M분"
  const remainingTimeFormatted = formatRemainingTime(remainingTime)

  // Check Ad-Free status
  const refresh = useCallback(async () => {
    try {
      const active = await isAdFreeActive()
      setIsAdFree(active)

      if (active) {
        const remaining = await getAdFreeRemainingTime()
        setRemainingTime(remaining)
      } else {
        setRemainingTime(0)
      }
    } catch (error) {
      console.warn('[useAdFree] Failed to check status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Activate Ad-Free mode
  const activate = useCallback(async () => {
    const expiryDate = await activateAdFree()
    await refresh()
    return expiryDate
  }, [refresh])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Update remaining time every minute when active
  useEffect(() => {
    if (!isAdFree) return

    const interval = setInterval(() => {
      getAdFreeRemainingTime().then((remaining) => {
        if (remaining <= 0) {
          setIsAdFree(false)
          setRemainingTime(0)
        } else {
          setRemainingTime(remaining)
        }
      })
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [isAdFree])

  return {
    isAdFree,
    remainingTime,
    remainingTimeFormatted,
    isLoading,
    activate,
    refresh,
  }
}

/**
 * Format milliseconds to human-readable string
 */
function formatRemainingTime(ms: number): string {
  if (ms <= 0) return ''

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  }
  return `${minutes}분`
}

export default useAdFree
