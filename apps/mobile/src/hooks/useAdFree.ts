/**
 * useAdFree Hook
 *
 * Manages Ad-Free Time (Focus Mode) state.
 * Users can watch a rewarded ad to get 24 hours of banner-free experience.
 *
 * @see ADMOB_MONETIZATION_STRATEGY.md Section 3.1
 */

import { useEffect, useMemo } from 'react'
import { useAdStore } from '../store/adStore'

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
  const isAdFree = useAdStore((s) => s.isAdFree)
  const remainingTime = useAdStore((s) => s.remainingTime)
  const isLoading = useAdStore((s) => s.isLoading)
  const refreshAdFree = useAdStore((s) => s.refreshAdFree)
  const activateAdFreeStore = useAdStore((s) => s.activateAdFree)

  // Format remaining time as "HH:MM" or "M분"
  const remainingTimeFormatted = useMemo(() => formatRemainingTime(remainingTime), [remainingTime])

  // Initial load
  useEffect(() => {
    refreshAdFree()
  }, [refreshAdFree])

  return {
    isAdFree,
    remainingTime,
    remainingTimeFormatted,
    isLoading,
    activate: activateAdFreeStore,
    refresh: refreshAdFree,
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
