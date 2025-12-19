import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getDayBoundsUTC, getUserToday, utcToUserDate } from '@mandaact/shared'
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
  last_check_date: Date | null
  longest_streak_date: Date | null
  created_at: string
  updated_at: string
}

export function setCachedGamificationNickname(
  queryClient: QueryClient,
  userId: string,
  nickname: string
): void {
  queryClient.setQueryData<UserGamification | null>(
    statsKeys.gamification(userId),
    (previous) => {
      const now = new Date().toISOString()

      if (!previous) {
        // Ensure nickname updates reflect immediately even before a user_levels row exists.
        return {
          id: userId,
          user_id: userId,
          nickname,
          total_xp: 0,
          current_level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_check_date: null,
          longest_streak_date: null,
          created_at: now,
          updated_at: now,
        }
      }

      return { ...previous, nickname, updated_at: now }
    }
  )
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
      // Get total actions from active mandalarts using INNER JOIN (same as web app)
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select(`
          id,
          type,
          sub_goal:sub_goals!inner(
            mandalart:mandalarts!inner(
              user_id,
              is_active
            )
          )
        `)
        .eq('sub_goal.mandalart.user_id', userId!)
        .eq('sub_goal.mandalart.is_active', true)

      if (actionsError) throw actionsError

      // Filter out reference type actions (they don't count towards completion)
      const total = (actionsData || []).filter(
        (action) => action.type !== 'reference'
      ).length

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
 * Uses user_levels table (same as shared xpService) + streak stats
 */
export function useUserGamification(userId: string | undefined) {
  return useQuery({
    queryKey: statsKeys.gamification(userId || ''),
    queryFn: async (): Promise<UserGamification | null> => {
      // 1. Get user level data from user_levels table (same as xpService uses)
      const { data: levelData, error: levelError } = await supabase
        .from('user_levels')
        .select('user_id, level, total_xp, nickname, created_at, updated_at')
        .eq('user_id', userId!)
        .single()

      if (levelError) {
        if (levelError.code === 'PGRST116') {
          // No record found, return null
          return null
        }
        throw levelError
      }

      // 2. Get streak stats using shared xpService
      const streakStats = await xpService.getStreakStats(userId!)

      // 3. Combine into UserGamification interface
      return {
        id: levelData.user_id, // Use user_id as id
        user_id: levelData.user_id,
        nickname: levelData.nickname || '',
        total_xp: levelData.total_xp,
        current_level: levelData.level,
        current_streak: streakStats.current,
        longest_streak: streakStats.longest,
        last_check_date: streakStats.lastCheckDate,
        longest_streak_date: streakStats.longestStreakDate,
        created_at: levelData.created_at,
        updated_at: levelData.updated_at,
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds (shorter to reflect XP changes faster)
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

      // Get total checkable actions using INNER JOIN (same as web app)
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select(`
          id,
          type,
          sub_goal:sub_goals!inner(
            mandalart:mandalarts!inner(
              user_id,
              is_active
            )
          )
        `)
        .eq('sub_goal.mandalart.user_id', userId!)
        .eq('sub_goal.mandalart.is_active', true)

      if (actionsError) throw actionsError

      // Filter out reference type actions
      const checkableActionsCount = (actionsData || []).filter(
        (action) => action.type !== 'reference'
      ).length

      totalCheckable = checkableActionsCount * 7

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

      // Count checks per day (using timezone-aware conversion)
      const checksByDay: Record<string, number> = {}
      checksData?.forEach((check) => {
        // Use utcToUserDate to convert UTC timestamp to KST date string
        const dateStr = utcToUserDate(check.checked_at)
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

export interface FourWeekHeatmapData {
  date: string
  count: number
  percentage: number
}

/**
 * Hook to fetch 4-week (28 days) heatmap data for streak display
 */
export function use4WeekHeatmap(userId: string | undefined) {
  return useQuery({
    queryKey: [...statsKeys.user(userId || ''), '4week-heatmap'] as const,
    queryFn: async (): Promise<FourWeekHeatmapData[]> => {
      // Get date range for last 28 days using KST timezone
      const todayStr = getUserToday() // KST today (YYYY-MM-DD)
      const [year, month, day] = todayStr.split('-').map(Number)
      const endDate = new Date(year, month - 1, day)
      const startDate = subDays(endDate, 27) // 28 days including today

      const startStr = format(startDate, 'yyyy-MM-dd')
      const endStr = todayStr // Use KST today directly

      // Get UTC bounds
      const { start: startUTC } = getDayBoundsUTC(startStr)
      const { end: endUTC } = getDayBoundsUTC(endStr)

      // Get all checks in the 28-day period
      const { data: checksData, error: checksError } = await supabase
        .from('check_history')
        .select('checked_at')
        .eq('user_id', userId!)
        .gte('checked_at', startUTC)
        .lt('checked_at', endUTC)

      if (checksError) throw checksError

      // Get total checkable actions using INNER JOIN (same as web app)
      // !inner ensures only matching rows are returned, not nulls
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select(`
          id,
          type,
          sub_goal:sub_goals!inner(
            mandalart:mandalarts!inner(
              user_id,
              is_active
            )
          )
        `)
        .eq('sub_goal.mandalart.user_id', userId!)
        .eq('sub_goal.mandalart.is_active', true)

      if (actionsError) throw actionsError

      // Filter out reference type actions (web app does this too)
      const totalActions = (actionsData || []).filter(
        (action) => action.type !== 'reference'
      ).length

      // Count checks per day (using timezone-aware conversion)
      const checksByDay: Record<string, number> = {}
      checksData?.forEach((check) => {
        // Use utcToUserDate to convert UTC timestamp to KST date string
        const dateStr = utcToUserDate(check.checked_at)
        checksByDay[dateStr] = (checksByDay[dateStr] || 0) + 1
      })

      // Build 28-day array with percentages
      const result: FourWeekHeatmapData[] = []
      for (let i = 0; i < 28; i++) {
        const date = subDays(endDate, 27 - i) // Start from oldest to newest
        const dateStr = format(date, 'yyyy-MM-dd')
        const count = checksByDay[dateStr] || 0
        const percentage = totalActions > 0 ? Math.round((count / totalActions) * 100) : 0

        result.push({ date: dateStr, count, percentage })
      }

      return result
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - shorter to reflect check changes faster
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

// Internal types for Supabase query responses
interface ActionWithType {
  id: string
  type: string
}

interface MandalartInfo {
  id: string
  title: string
  user_id: string
  is_active: boolean
}

interface SubGoalWithRelations {
  id: string
  title: string
  mandalart: MandalartInfo | MandalartInfo[]
  actions: ActionWithType[] | null
}

interface ActionWithSubGoal {
  id: string
  type: string
  sub_goal: Array<{
    mandalart: MandalartInfo | MandalartInfo[] | null
  }> | null
}

export interface ProfileStats {
  totalChecks: number
  activeDays: number
}

/**
 * Hook to fetch total checks and active days (for profile card)
 */
export function useProfileStats(userId: string | undefined) {
  return useQuery({
    queryKey: [...statsKeys.user(userId || ''), 'profile-stats'] as const,
    queryFn: async (): Promise<ProfileStats> => {
      // Get total checks count
      const { count: totalChecks, error: checksCountError } = await supabase
        .from('check_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId!)

      if (checksCountError) throw checksCountError

      // Get all check dates to count unique active days
      const { data: checksData, error: checksError } = await supabase
        .from('check_history')
        .select('checked_at')
        .eq('user_id', userId!)

      if (checksError) throw checksError

      // Count unique dates (active days) using timezone-aware conversion
      const uniqueDates = new Set(
        checksData?.map((check) => {
          // Use utcToUserDate to convert UTC timestamp to KST date string
          return utcToUserDate(check.checked_at)
        }) || []
      )

      return {
        totalChecks: totalChecks || 0,
        activeDays: uniqueDates.size,
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch sub-goal progress
 */
export function useSubGoalProgress(userId: string | undefined) {
  const today = getUserToday()

  return useQuery({
    queryKey: [...statsKeys.user(userId || ''), 'subgoal-progress', today] as const,
    queryFn: async (): Promise<SubGoalProgress[]> => {
      // Get all sub-goals with actions from active mandalarts using INNER JOIN
      const { data: subGoalsData, error: subGoalsError } = await supabase
        .from('sub_goals')
        .select(`
          id,
          title,
          mandalart:mandalarts!inner(
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

      // Build progress data (with INNER JOIN, mandalart is always present)
      const progress: SubGoalProgress[] = ((subGoalsData || []) as SubGoalWithRelations[])
        .map((sg) => {
          const actions = sg.actions || []
          const checkableActions = actions.filter((a) => a.type !== 'reference')
          const completedToday = checkableActions.filter((a) => checkedActionIds.has(a.id)).length
          const totalActions = checkableActions.length
          const completionRate = totalActions > 0 ? Math.round((completedToday / totalActions) * 100) : 0

          // Handle both array and object response (same as web app pattern)
          const mandalart = Array.isArray(sg.mandalart) ? sg.mandalart[0] : sg.mandalart

          return {
            id: sg.id,
            title: sg.title,
            mandalartTitle: mandalart?.title || '',
            totalActions,
            completedToday,
            completionRate,
          }
        })
        .filter((p) => p.totalActions > 0)

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
    baseXP: number = 10,
    targetDate?: Date
  ): Promise<AwardXPResult> => {
    // Use shared xpService (pass targetDate for weekend bonus calculation)
    const result = await xpService.awardXP(userId, baseXP, targetDate)

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

  /**
   * Check weekly completion and activate Perfect Week bonus if 80%+
   */
  const checkPerfectWeek = async (userId: string): Promise<{ activated: boolean; percentage: number }> => {
    try {
      // Calculate weekly completion (same logic as useWeeklyStats)
      let totalChecked = 0

      for (let i = 0; i < 7; i++) {
        const date = subDays(new Date(), i)
        const dateStr = format(date, 'yyyy-MM-dd')
        const { start: dayStart, end: dayEnd } = getDayBoundsUTC(dateStr)

        const { count } = await supabase
          .from('check_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('checked_at', dayStart)
          .lt('checked_at', dayEnd)

        totalChecked += count || 0
      }

      // Get total checkable actions
      const { data: actionsData } = await supabase
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
        .eq('sub_goal.mandalart.user_id', userId)
        .eq('sub_goal.mandalart.is_active', true)

      const checkableActions = ((actionsData || []) as ActionWithSubGoal[]).filter((action) =>
        action.type !== 'reference' &&
        action.sub_goal &&
        Array.isArray(action.sub_goal) &&
        action.sub_goal[0]?.mandalart
      )

      const totalCheckable = checkableActions.length * 7
      const percentage = totalCheckable > 0 ? Math.round((totalChecked / totalCheckable) * 100) : 0

      // Activate Perfect Week bonus if 80%+
      if (percentage >= 80) {
        const activated = await xpService.activatePerfectWeekBonus(userId)
        if (activated) {
          queryClient.invalidateQueries({ queryKey: statsKeys.gamification(userId) })
        }
        return { activated, percentage }
      }

      return { activated: false, percentage }
    } catch (error) {
      console.error('Error checking perfect week:', error)
      return { activated: false, percentage: 0 }
    }
  }

  /**
   * Subtract XP when unchecking (same calculation as awarding)
   * @param targetDate - The date for which XP was awarded (affects weekend bonus calculation)
   */
  const subtractXP = async (userId: string, baseXP: number = 10, targetDate?: Date): Promise<{ finalXP: number }> => {
    try {
      // Get streak for bonus calculation (same as award)
      const streakStats = await xpService.getStreakStats(userId)
      const streakBonus = streakStats.current >= 7 ? 5 : 0
      const subtotalXP = baseXP + streakBonus

      // Apply multipliers (same as award, using targetDate for weekend bonus)
      const multipliers = await xpService.getActiveMultipliers(userId, targetDate)
      const totalMultiplier = xpService.calculateTotalMultiplier(multipliers)
      const finalXP = Math.floor(subtotalXP * totalMultiplier)

      // Subtract XP (negative value) - check result
      const result = await xpService.updateUserXP(userId, -finalXP)

      if (!result.success) {
        console.error('Failed to subtract XP: updateUserXP returned success=false')
        return { finalXP: 0 }
      }

      // Invalidate gamification queries
      queryClient.invalidateQueries({ queryKey: statsKeys.gamification(userId) })

      return { finalXP }
    } catch (error) {
      console.error('Error subtracting XP:', error)
      return { finalXP: 0 }
    }
  }

  return { awardXP, subtractXP, checkPerfectDay, checkPerfectWeek }
}
