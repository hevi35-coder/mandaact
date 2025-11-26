import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getDayBoundsUTC, getUserToday } from '@mandaact/shared'
import { format, subDays } from 'date-fns'

/**
 * Query key factory for stats
 */
export const statsKeys = {
  all: ['stats'] as const,
  user: (userId: string) => [...statsKeys.all, userId] as const,
  daily: (userId: string, date: string) => [...statsKeys.user(userId), 'daily', date] as const,
  gamification: (userId: string) => [...statsKeys.user(userId), 'gamification'] as const,
  streak: (userId: string) => [...statsKeys.user(userId), 'streak'] as const,
}

export interface DailyStats {
  checked: number
  total: number
  percentage: number
}

export interface UserGamification {
  id: string
  user_id: string
  nickname: string
  total_xp: number
  current_level: number
  current_streak: number
  longest_streak: number
  created_at: string
  updated_at: string
}

/**
 * Hook to fetch daily completion stats
 */
export function useDailyStats(userId: string | undefined, date?: Date) {
  const targetDate = date || new Date()
  const dateStr = format(targetDate, 'yyyy-MM-dd')

  return useQuery({
    queryKey: statsKeys.daily(userId || '', dateStr),
    queryFn: async (): Promise<DailyStats> => {
      // Get total actions from active mandalarts
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select(`
          id,
          type,
          sub_goal:sub_goals (
            mandalart:mandalarts (
              user_id,
              is_active
            )
          )
        `)
        .eq('sub_goal.mandalart.user_id', userId!)
        .eq('sub_goal.mandalart.is_active', true)

      if (actionsError) throw actionsError

      // Filter out reference type actions (they don't count towards completion)
      const checkableActions = (actionsData || []).filter(
        (action: { type: string; sub_goal: { mandalart: object | null } | null }) =>
          action.type !== 'reference' && action.sub_goal?.mandalart != null
      )

      const total = checkableActions.length

      // Get checks for the date
      const { start: dayStart, end: dayEnd } = getDayBoundsUTC(dateStr)
      const { count, error: checksError } = await supabase
        .from('check_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .gte('checked_at', dayStart)
        .lt('checked_at', dayEnd)

      if (checksError) throw checksError

      const checked = count || 0
      const percentage = total > 0 ? Math.round((checked / total) * 100) : 0

      return { checked, total, percentage }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch user gamification data (XP, level, streaks)
 */
export function useUserGamification(userId: string | undefined) {
  return useQuery({
    queryKey: statsKeys.gamification(userId || ''),
    queryFn: async (): Promise<UserGamification | null> => {
      const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId!)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found, return null
          return null
        }
        throw error
      }

      return data
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch weekly completion stats
 */
export function useWeeklyStats(userId: string | undefined) {
  const today = getUserToday()

  return useQuery({
    queryKey: [...statsKeys.user(userId || ''), 'weekly', today] as const,
    queryFn: async (): Promise<DailyStats> => {
      // Calculate 7 days of data
      let totalChecked = 0
      let totalCheckable = 0

      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const { start: dayStart, end: dayEnd } = getDayBoundsUTC(dateStr)

        // Get checks for this day
        const { count, error: checksError } = await supabase
          .from('check_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId!)
          .gte('checked_at', dayStart)
          .lt('checked_at', dayEnd)

        if (checksError) throw checksError
        totalChecked += count || 0
      }

      // Get total checkable actions (approximate as today's count * 7)
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select(`
          id,
          type,
          sub_goal:sub_goals (
            mandalart:mandalarts (
              user_id,
              is_active
            )
          )
        `)
        .eq('sub_goal.mandalart.user_id', userId!)
        .eq('sub_goal.mandalart.is_active', true)

      if (actionsError) throw actionsError

      const checkableActions = (actionsData || []).filter(
        (action: { type: string; sub_goal: { mandalart: object | null } | null }) =>
          action.type !== 'reference' && action.sub_goal?.mandalart != null
      )

      totalCheckable = checkableActions.length * 7

      const percentage =
        totalCheckable > 0
          ? Math.round((totalChecked / totalCheckable) * 100)
          : 0

      return {
        checked: totalChecked,
        total: totalCheckable,
        percentage,
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
