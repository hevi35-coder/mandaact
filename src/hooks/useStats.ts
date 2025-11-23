import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getStreakStats,
  getCompletionStats,
  getUserLevel,
  checkAndUnlockAchievements,
  type StreakStats,
  type CompletionStats,
} from '@/lib/stats'
import type { Achievement } from '@/types'

/**
 * Query key factory for stats
 */
export const statsKeys = {
  all: ['stats'] as const,
  gamification: (userId: string) => [...statsKeys.all, 'gamification', userId] as const,
  streak: (userId: string) => [...statsKeys.all, 'streak', userId] as const,
  completion: (userId: string) => [...statsKeys.all, 'completion', userId] as const,
  level: (userId: string) => [...statsKeys.all, 'level', userId] as const,
  achievements: (userId: string) => [...statsKeys.all, 'achievements', userId] as const,
}

/**
 * Hook to fetch user level and XP data
 * Replaces the old getUserGamification - getUserLevel provides same data
 */
export function useUserGamification(userId: string | undefined) {
  return useQuery({
    queryKey: statsKeys.gamification(userId || ''),
    queryFn: () => getUserLevel(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch streak stats
 */
export function useStreakStats(userId: string | undefined) {
  return useQuery({
    queryKey: statsKeys.streak(userId || ''),
    queryFn: () => getStreakStats(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes (streaks change slowly)
  })
}

/**
 * Hook to fetch completion stats
 */
export function useCompletionStats(userId: string | undefined) {
  return useQuery({
    queryKey: statsKeys.completion(userId || ''),
    queryFn: () => getCompletionStats(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch user level
 */
export function useUserLevel(userId: string | undefined) {
  return useQuery({
    queryKey: statsKeys.level(userId || ''),
    queryFn: () => getUserLevel(userId!),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook to check and unlock achievements
 * Note: This is a special hook that can trigger side effects (unlocking badges)
 */
export function useCheckAchievements(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: statsKeys.achievements(userId || ''),
    queryFn: async () => {
      const newlyUnlocked = await checkAndUnlockAchievements(userId!)

      // If new badges were unlocked, invalidate related queries
      if (newlyUnlocked && newlyUnlocked.length > 0) {
        queryClient.invalidateQueries({ queryKey: statsKeys.gamification(userId!) })
      }

      return newlyUnlocked
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds (check frequently for new badges)
  })
}

/**
 * Utility hook to invalidate all stats caches
 * Useful after actions that affect stats (e.g., check toggle, XP award)
 */
export function useInvalidateStats() {
  const queryClient = useQueryClient()

  return (userId: string) => {
    queryClient.invalidateQueries({ queryKey: statsKeys.gamification(userId) })
    queryClient.invalidateQueries({ queryKey: statsKeys.streak(userId) })
    queryClient.invalidateQueries({ queryKey: statsKeys.completion(userId) })
    queryClient.invalidateQueries({ queryKey: statsKeys.level(userId) })
    queryClient.invalidateQueries({ queryKey: statsKeys.achievements(userId) })
  }
}
