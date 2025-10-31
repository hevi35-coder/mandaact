// Statistics calculation utilities for MandaAct

import { supabase } from './supabase'

export interface CompletionStats {
  today: {
    checked: number
    total: number
    percentage: number
  }
  week: {
    checked: number
    total: number
    percentage: number
  }
  month: {
    checked: number
    total: number
    percentage: number
  }
}

export interface StreakStats {
  current: number
  longest: number
  lastCheckDate: Date | null
}

export interface GoalProgress {
  subGoalId: string
  subGoalTitle: string
  position: number
  totalActions: number
  checkedToday: number
  checkedThisWeek: number
  weeklyPercentage: number
}

export interface MotivationalMessage {
  title: string
  message: string
  emoji: string
  variant: 'success' | 'warning' | 'info'
}

/**
 * Get total number of actions for a user
 */
export async function getTotalActionsCount(userId: string): Promise<number> {
  // Get all actions for user's mandalarts
  const { data: actions, error } = await supabase
    .from('actions')
    .select(`
      id,
      sub_goal:sub_goals!inner(
        id,
        mandalart:mandalarts!inner(
          id,
          user_id
        )
      )
    `)
    .eq('sub_goal.mandalart.user_id', userId)

  if (error) {
    console.error('Error getting total actions:', error)
    return 0
  }

  return actions?.length || 0
}

/**
 * Get completion statistics for today, this week, and this month
 */
export async function getCompletionStats(userId: string): Promise<CompletionStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Start of this week (Sunday)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)

  // Start of this month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  monthStart.setHours(0, 0, 0, 0)

  // Get total actions count
  const totalActions = await getTotalActionsCount(userId)

  // Get today's checks
  const { count: todayCount } = await supabase
    .from('check_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('checked_at', today.toISOString())
    .lt('checked_at', tomorrow.toISOString())

  // Get this week's checks
  const { count: weekCount } = await supabase
    .from('check_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('checked_at', weekStart.toISOString())

  // Get this month's checks
  const { count: monthCount } = await supabase
    .from('check_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('checked_at', monthStart.toISOString())

  const todayChecked = todayCount || 0
  const weekChecked = weekCount || 0
  const monthChecked = monthCount || 0

  return {
    today: {
      checked: todayChecked,
      total: totalActions,
      percentage: totalActions > 0 ? Math.round((todayChecked / totalActions) * 100) : 0
    },
    week: {
      checked: weekChecked,
      total: totalActions * 7, // 7 days
      percentage: totalActions > 0 ? Math.round((weekChecked / (totalActions * 7)) * 100) : 0
    },
    month: {
      checked: monthChecked,
      total: totalActions * new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
      percentage:
        totalActions > 0
          ? Math.round(
              (monthChecked /
                (totalActions * new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())) *
                100
            )
          : 0
    }
  }
}

/**
 * Calculate streak statistics
 */
export async function getStreakStats(userId: string): Promise<StreakStats> {
  // Get all unique check dates, sorted descending
  const { data: checks, error } = await supabase
    .from('check_history')
    .select('checked_at')
    .eq('user_id', userId)
    .order('checked_at', { ascending: false })

  if (error || !checks || checks.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastCheckDate: null
    }
  }

  // Extract unique dates (convert to YYYY-MM-DD format)
  const uniqueDates = Array.from(
    new Set(
      checks.map((check) => {
        const date = new Date(check.checked_at)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      })
    )
  ).sort((a, b) => b.localeCompare(a)) // Sort descending

  if (uniqueDates.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastCheckDate: null
    }
  }

  // Parse dates
  const dates = uniqueDates.map((dateStr) => new Date(dateStr))
  const lastCheckDate = dates[0]

  // Calculate current streak
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let checkDate = new Date(dates[0])
  checkDate.setHours(0, 0, 0, 0)

  // Only count current streak if last check was today or yesterday
  if (checkDate.getTime() === today.getTime() || checkDate.getTime() === yesterday.getTime()) {
    let expectedDate = new Date(checkDate)
    for (const date of dates) {
      const currentDate = new Date(date)
      currentDate.setHours(0, 0, 0, 0)

      if (currentDate.getTime() === expectedDate.getTime()) {
        currentStreak++
        expectedDate.setDate(expectedDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  // Calculate longest streak
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
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCheckDate
  }
}

/**
 * Get progress for each sub-goal
 */
export async function getGoalProgress(userId: string): Promise<GoalProgress[]> {
  // Get all sub-goals with their actions and checks
  const { data: subGoals, error } = await supabase
    .from('sub_goals')
    .select(
      `
      id,
      title,
      position,
      mandalart:mandalarts!inner(user_id),
      actions(
        id,
        check_history(checked_at)
      )
    `
    )
    .eq('mandalart.user_id', userId)
    .order('position')

  if (error || !subGoals) {
    console.error('Error getting goal progress:', error)
    return []
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)

  return subGoals.map((sg: any) => {
    const totalActions = sg.actions?.length || 0

    // Count unique actions checked today
    const checkedToday = new Set(
      sg.actions
        ?.filter((action: any) =>
          action.check_history?.some((check: any) => {
            const checkDate = new Date(check.checked_at)
            return checkDate >= today && checkDate < tomorrow
          })
        )
        .map((action: any) => action.id)
    ).size

    // Count unique actions checked this week
    const checkedThisWeek = new Set(
      sg.actions
        ?.filter((action: any) =>
          action.check_history?.some((check: any) => {
            const checkDate = new Date(check.checked_at)
            return checkDate >= weekStart
          })
        )
        .map((action: any) => action.id)
    ).size

    return {
      subGoalId: sg.id,
      subGoalTitle: sg.title,
      position: sg.position,
      totalActions,
      checkedToday,
      checkedThisWeek,
      weeklyPercentage: totalActions > 0 ? Math.round((checkedThisWeek / (totalActions * 7)) * 100) : 0
    }
  })
}

/**
 * Generate motivational message based on stats
 */
export function generateMotivationalMessage(
  completionStats: CompletionStats,
  streakStats: StreakStats
): MotivationalMessage {
  const { today, week } = completionStats
  const { current } = streakStats

  // High achievement
  if (today.percentage >= 80) {
    return {
      title: '대단해요!',
      message: `오늘 ${today.percentage}% 달성! 완벽한 하루를 보내고 계시네요!`,
      emoji: '🎉',
      variant: 'success'
    }
  }

  // Good streak
  if (current >= 7) {
    return {
      title: '연속 실천 중!',
      message: `${current}일 연속 실천 중입니다! 꾸준함이 힘이에요!`,
      emoji: '🔥',
      variant: 'success'
    }
  }

  // Good weekly progress
  if (week.percentage >= 50) {
    return {
      title: '좋은 진행이에요!',
      message: `이번 주 ${week.percentage}% 완료! 계속 이대로 가세요!`,
      emoji: '👍',
      variant: 'success'
    }
  }

  // Need encouragement
  if (today.percentage < 30 && week.percentage < 30) {
    return {
      title: '시작이 반이에요!',
      message: '작은 실천 하나가 큰 변화를 만듭니다. 오늘 하나만 체크해보세요!',
      emoji: '💪',
      variant: 'warning'
    }
  }

  // Moderate progress
  if (today.percentage >= 30 && today.percentage < 80) {
    return {
      title: '잘하고 있어요!',
      message: `오늘 ${today.checked}개 완료! 조금만 더 힘내봐요!`,
      emoji: '⭐',
      variant: 'info'
    }
  }

  // Default encouragement
  return {
    title: '오늘도 화이팅!',
    message: '목표를 향한 작은 실천이 쌓이고 있어요. 꾸준히 해나가봐요!',
    emoji: '🌟',
    variant: 'info'
  }
}
