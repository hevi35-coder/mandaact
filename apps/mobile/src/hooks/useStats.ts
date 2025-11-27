import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getDayBoundsUTC, getUserToday, getLevelFromXP, calculateXPForLevel } from '@mandaact/shared'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { logger } from '../lib/logger'

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
// XP MANAGEMENT FUNCTIONS
// ============================================================================

export interface StreakStats {
  current: number
  longest: number
}

/**
 * Get streak statistics for a user
 */
export async function getStreakStats(userId: string): Promise<StreakStats> {
  try {
    // Get all unique check dates, sorted descending
    const { data: checks, error } = await supabase
      .from('check_history')
      .select('checked_at')
      .eq('user_id', userId)
      .order('checked_at', { ascending: false })

    if (error || !checks || checks.length === 0) {
      return { current: 0, longest: 0 }
    }

    // Extract unique dates (convert to KST YYYY-MM-DD format)
    const uniqueDates = Array.from(
      new Set(
        checks.map((check) => {
          const date = new Date(check.checked_at)
          // Convert to KST (UTC+9)
          date.setHours(date.getHours() + 9)
          return format(date, 'yyyy-MM-dd')
        })
      )
    ).sort((a, b) => b.localeCompare(a)) // Sort descending

    if (uniqueDates.length === 0) {
      return { current: 0, longest: 0 }
    }

    // Calculate current streak
    let currentStreak = 0
    const today = new Date()
    today.setHours(today.getHours() + 9) // Convert to KST
    const todayStr = format(today, 'yyyy-MM-dd')

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(yesterday.getHours() + 9)
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

    // Only count current streak if last check was today or yesterday
    const lastCheckDateStr = uniqueDates[0]
    if (lastCheckDateStr === todayStr || lastCheckDateStr === yesterdayStr) {
      let expectedDateStr = lastCheckDateStr
      for (const dateStr of uniqueDates) {
        if (dateStr === expectedDateStr) {
          currentStreak++
          // Move expected date one day back
          const expectedDate = new Date(expectedDateStr)
          expectedDate.setDate(expectedDate.getDate() - 1)
          expectedDateStr = format(expectedDate, 'yyyy-MM-dd')
        } else {
          break
        }
      }
    }

    // Calculate longest streak
    const dates = uniqueDates.map((dateStr) => new Date(dateStr))
    let longestStreak = 0
    let tempStreak = 1

    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i])
      const next = new Date(dates[i + 1])
      current.setHours(0, 0, 0, 0)
      next.setHours(0, 0, 0, 0)

      const diffDays = Math.round((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        tempStreak++
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak
        }
        tempStreak = 1
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak
    }

    return { current: currentStreak, longest: longestStreak }
  } catch (error) {
    logger.error('Error getting streak stats', error)
    return { current: 0, longest: 0 }
  }
}

/**
 * Get or create user level record from user_levels table
 */
export async function getUserLevel(userId: string): Promise<{ level: number; total_xp: number } | null> {
  try {
    const { data, error } = await supabase
      .from('user_levels')
      .select('level, total_xp')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found, create one
        const { data: newData, error: insertError } = await supabase
          .from('user_levels')
          .insert({ user_id: userId, level: 1, total_xp: 0 })
          .select('level, total_xp')
          .single()

        if (insertError) {
          logger.error('Error creating user level', insertError)
          return null
        }
        return newData
      }
      logger.error('Error fetching user level', error)
      return null
    }

    return data
  } catch (error) {
    logger.error('Error in getUserLevel', error)
    return null
  }
}

/**
 * Update user XP and level
 */
export async function updateUserXP(userId: string, xpToAdd: number): Promise<{
  success: boolean
  newLevel?: number
  oldLevel?: number
  leveledUp?: boolean
  newTotalXP?: number
}> {
  try {
    const currentLevel = await getUserLevel(userId)
    if (!currentLevel) {
      return { success: false }
    }

    // Calculate new XP (prevent negative)
    const newTotalXP = Math.max(0, currentLevel.total_xp + xpToAdd)
    const newLevel = getLevelFromXP(newTotalXP)

    const { error } = await supabase
      .from('user_levels')
      .update({
        total_xp: newTotalXP,
        level: newLevel
      })
      .eq('user_id', userId)

    if (error) {
      logger.error('Error updating user XP', error)
      return { success: false }
    }

    return {
      success: true,
      newLevel,
      oldLevel: currentLevel.level,
      leveledUp: newLevel > currentLevel.level,
      newTotalXP
    }
  } catch (error) {
    logger.error('Error in updateUserXP', error)
    return { success: false }
  }
}

/**
 * Check and award perfect day XP bonus (+50 XP if 100% completion)
 */
export async function checkAndAwardPerfectDayXP(
  userId: string,
  dateStr?: string
): Promise<{
  is_perfect_day: boolean
  xp_awarded: number
  total_actions: number
  completed_actions: number
}> {
  try {
    const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd')

    const { data, error } = await supabase.rpc('check_and_award_perfect_day_xp', {
      p_user_id: userId,
      p_date: targetDate
    })

    if (error) {
      logger.error('Error checking perfect day', error)
      return {
        is_perfect_day: false,
        xp_awarded: 0,
        total_actions: 0,
        completed_actions: 0
      }
    }

    return data || {
      is_perfect_day: false,
      xp_awarded: 0,
      total_actions: 0,
      completed_actions: 0
    }
  } catch (error) {
    logger.error('Error in checkAndAwardPerfectDayXP', error)
    return {
      is_perfect_day: false,
      xp_awarded: 0,
      total_actions: 0,
      completed_actions: 0
    }
  }
}

export interface XPMultiplier {
  type: 'weekend' | 'comeback' | 'level_milestone' | 'perfect_week'
  name: string
  multiplier: number
}

/**
 * Get active XP multipliers for a user (simplified version)
 */
export async function getActiveMultipliers(userId: string): Promise<XPMultiplier[]> {
  const multipliers: XPMultiplier[] = []

  // 1. Weekend bonus (always check, no DB query needed)
  const today = new Date()
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  if (isWeekend) {
    multipliers.push({
      type: 'weekend',
      name: '주말 보너스',
      multiplier: 1.5
    })
  }

  // 2. Check for other bonuses from user_bonus_xp table
  try {
    const { data: bonuses } = await supabase
      .from('user_bonus_xp')
      .select('bonus_type, multiplier')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString())

    if (bonuses) {
      for (const bonus of bonuses) {
        if (bonus.bonus_type === 'comeback') {
          multipliers.push({
            type: 'comeback',
            name: '컴백 보너스',
            multiplier: bonus.multiplier || 1.5
          })
        } else if (bonus.bonus_type === 'level_milestone') {
          multipliers.push({
            type: 'level_milestone',
            name: '레벨 마일스톤',
            multiplier: bonus.multiplier || 2.0
          })
        } else if (bonus.bonus_type === 'perfect_week') {
          multipliers.push({
            type: 'perfect_week',
            name: '완벽한 주',
            multiplier: bonus.multiplier || 2.0
          })
        }
      }
    }
  } catch (error) {
    logger.error('Error fetching multipliers', error)
  }

  return multipliers
}

/**
 * Calculate total multiplier (stacks additively)
 */
export function calculateTotalMultiplier(multipliers: XPMultiplier[]): number {
  if (multipliers.length === 0) return 1.0
  return multipliers.reduce((sum, m) => sum + m.multiplier, 0)
}

/**
 * Hook to use XP update with invalidation
 */
export function useXPUpdate() {
  const queryClient = useQueryClient()

  const awardXP = async (
    userId: string,
    baseXP: number = 10
  ): Promise<{ finalXP: number; multipliers: XPMultiplier[]; leveledUp: boolean }> => {
    // Get streak for bonus
    const streakStats = await getStreakStats(userId)
    const streakBonus = streakStats.current >= 7 ? 5 : 0
    const subtotalXP = baseXP + streakBonus

    // Apply multipliers
    const multipliers = await getActiveMultipliers(userId)
    const totalMultiplier = calculateTotalMultiplier(multipliers)
    const finalXP = Math.floor(subtotalXP * totalMultiplier)

    // Update XP
    const result = await updateUserXP(userId, finalXP)

    // Invalidate gamification queries
    queryClient.invalidateQueries({ queryKey: statsKeys.gamification(userId) })

    return {
      finalXP,
      multipliers,
      leveledUp: result.leveledUp || false
    }
  }

  const checkPerfectDay = async (userId: string, dateStr?: string) => {
    const result = await checkAndAwardPerfectDayXP(userId, dateStr)

    if (result.is_perfect_day && result.xp_awarded > 0) {
      // Invalidate gamification queries
      queryClient.invalidateQueries({ queryKey: statsKeys.gamification(userId) })
    }

    return result
  }

  return { awardXP, checkPerfectDay }
}
