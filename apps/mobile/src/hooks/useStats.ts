import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getDayBoundsUTC, getUserToday } from '@mandaact/shared'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { xpService } from '../lib/xp'
import type { XPMultiplier, AwardXPResult, PerfectDayResult } from '../lib/xp'

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkableActions = (actionsData || []).filter((action: any) =>
        action.type !== 'reference' &&
        action.sub_goal &&
        Array.isArray(action.sub_goal) &&
        action.sub_goal[0]?.mandalart
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkableActions = (actionsData || []).filter((action: any) =>
        action.type !== 'reference' &&
        action.sub_goal &&
        Array.isArray(action.sub_goal) &&
        action.sub_goal[0]?.mandalart
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

export interface HeatmapData {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

/**
 * Hook to fetch heatmap data for a month
 */
export function useHeatmapData(userId: string | undefined, month: Date = new Date()) {
  const monthKey = format(month, 'yyyy-MM')

  return useQuery({
    queryKey: [...statsKeys.user(userId || ''), 'heatmap', monthKey] as const,
    queryFn: async (): Promise<HeatmapData[]> => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

      // Get all checks for the month
      const { start: startUTC } = getDayBoundsUTC(format(monthStart, 'yyyy-MM-dd'))
      const { end: endUTC } = getDayBoundsUTC(format(monthEnd, 'yyyy-MM-dd'))

      const { data: checksData, error } = await supabase
        .from('check_history')
        .select('checked_at')
        .eq('user_id', userId!)
        .gte('checked_at', startUTC)
        .lt('checked_at', endUTC)

      if (error) throw error

      // Count checks per day
      const checksByDay: Record<string, number> = {}
      checksData?.forEach((check) => {
        const dateStr = format(new Date(check.checked_at), 'yyyy-MM-dd')
        checksByDay[dateStr] = (checksByDay[dateStr] || 0) + 1
      })

      // Calculate max checks for level normalization
      const maxChecks = Math.max(...Object.values(checksByDay), 1)

      // Build heatmap data
      return days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const count = checksByDay[dateStr] || 0
        let level: 0 | 1 | 2 | 3 | 4 = 0

        if (count > 0) {
          const ratio = count / maxChecks
          if (ratio >= 0.75) level = 4
          else if (ratio >= 0.5) level = 3
          else if (ratio >= 0.25) level = 2
          else level = 1
        }

        return { date: dateStr, count, level }
      })
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export interface SubGoalProgress {
  id: string
  title: string
  mandalartTitle: string
  totalActions: number
  completedToday: number
  completionRate: number
}

/**
 * Hook to fetch sub-goal progress
 */
export function useSubGoalProgress(userId: string | undefined) {
  const today = getUserToday()

  return useQuery({
    queryKey: [...statsKeys.user(userId || ''), 'subgoal-progress', today] as const,
    queryFn: async (): Promise<SubGoalProgress[]> => {
      // Get all sub-goals with actions from active mandalarts
      const { data: subGoalsData, error: subGoalsError } = await supabase
        .from('sub_goals')
        .select(`
          id,
          title,
          mandalart:mandalarts (
            id,
            title,
            user_id,
            is_active
          ),
          actions (
            id,
            type
          )
        `)
        .eq('mandalart.user_id', userId!)
        .eq('mandalart.is_active', true)

      if (subGoalsError) throw subGoalsError

      // Get today's checks
      const { start: dayStart, end: dayEnd } = getDayBoundsUTC(today)
      const { data: checksData, error: checksError } = await supabase
        .from('check_history')
        .select('action_id')
        .eq('user_id', userId!)
        .gte('checked_at', dayStart)
        .lt('checked_at', dayEnd)

      if (checksError) throw checksError

      const checkedActionIds = new Set(checksData?.map((c) => c.action_id) || [])

      // Build progress data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progress: SubGoalProgress[] = (subGoalsData || [])
        .filter((sg: any) => sg.mandalart && Array.isArray(sg.mandalart) && sg.mandalart.length > 0)
        .map((sg: any) => {
          const checkableActions = (sg.actions || []).filter((a: any) => a.type !== 'reference')
          const completedToday = checkableActions.filter((a: any) => checkedActionIds.has(a.id)).length
          const totalActions = checkableActions.length
          const completionRate = totalActions > 0 ? Math.round((completedToday / totalActions) * 100) : 0

          return {
            id: sg.id,
            title: sg.title,
            mandalartTitle: sg.mandalart[0]?.title || '',
            totalActions,
            completedToday,
            completionRate,
          }
        })
        .filter((p: SubGoalProgress) => p.totalActions > 0)

      return progress
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// ============================================================================
// XP MANAGEMENT HOOK (uses shared xpService)
// ============================================================================

// Re-export types from shared
export type { XPMultiplier, AwardXPResult, PerfectDayResult }

/**
 * Hook to use XP update with query invalidation
 * Uses shared xpService from @mandaact/shared
 */
export function useXPUpdate() {
  const queryClient = useQueryClient()

  const awardXP = async (
    userId: string,
    baseXP: number = 10
  ): Promise<AwardXPResult> => {
    // Use shared xpService
    const result = await xpService.awardXP(userId, baseXP)

    // Invalidate gamification queries
    queryClient.invalidateQueries({ queryKey: statsKeys.gamification(userId) })

    return result
  }

  const checkPerfectDay = async (userId: string, dateStr?: string): Promise<PerfectDayResult> => {
    // Use shared xpService
    const result = await xpService.checkAndAwardPerfectDayXP(userId, dateStr)

    if (result.is_perfect_day && result.xp_awarded > 0) {
      // Invalidate gamification queries
      queryClient.invalidateQueries({ queryKey: statsKeys.gamification(userId) })
    }

    return result
  }

  return { awardXP, checkPerfectDay }
}
