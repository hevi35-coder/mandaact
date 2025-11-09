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
  mandalartId?: string
  mandalartTitle?: string
}

export interface MotivationalMessage {
  title: string
  message: string
  emoji: string
  variant: 'success' | 'warning' | 'info'
  showAIButton?: boolean
}

/**
 * Get total number of actions for a user
 * @param userId - User ID
 * @param mandalartId - Optional mandalart ID to filter by
 */
export async function getTotalActionsCount(userId: string, mandalartId?: string): Promise<number> {
  // Get all actions for user's mandalarts
  let query = supabase
    .from('actions')
    .select(`
      id,
      sub_goal:sub_goals!inner(
        id,
        mandalart:mandalarts!inner(
          id,
          user_id,
          is_active
        )
      )
    `)
    .eq('sub_goal.mandalart.user_id', userId)
    .eq('sub_goal.mandalart.is_active', true)

  // Add mandalart filter if provided
  if (mandalartId) {
    query = query.eq('sub_goal.mandalart.id', mandalartId)
  }

  const { data: actions, error } = await query

  if (error) {
    console.error('Error getting total actions:', error)
    return 0
  }

  return actions?.length || 0
}

/**
 * Get completion statistics for today, this week, and this month
 * @param userId - User ID
 * @param mandalartId - Optional mandalart ID to filter by
 */
export async function getCompletionStats(userId: string, mandalartId?: string): Promise<CompletionStats> {
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
  const totalActions = await getTotalActionsCount(userId, mandalartId)

  // Get action IDs to filter checks (always filter by is_active)
  let actionsQuery = supabase
    .from('actions')
    .select(`
      id,
      sub_goal:sub_goals!inner(
        mandalart:mandalarts!inner(
          id,
          is_active
        )
      )
    `)
    .eq('sub_goal.mandalart.is_active', true)

  if (mandalartId) {
    actionsQuery = actionsQuery.eq('sub_goal.mandalart.id', mandalartId)
  }

  const { data: actions } = await actionsQuery
  const actionIds = actions?.map(a => a.id) || []

  // Get today's checks
  const { count: todayCount } = await supabase
    .from('check_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('checked_at', today.toISOString())
    .lt('checked_at', tomorrow.toISOString())
    .in('action_id', actionIds)

  // Get this week's checks
  const { count: weekCount } = await supabase
    .from('check_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('checked_at', weekStart.toISOString())
    .in('action_id', actionIds)

  // Get this month's checks
  const { count: monthCount } = await supabase
    .from('check_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('checked_at', monthStart.toISOString())
    .in('action_id', actionIds)

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

  // Get actual last check time (with full timestamp)
  const lastCheckDate = checks.length > 0 ? new Date(checks[0].checked_at) : null

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

  // Parse dates for streak calculation
  const dates = uniqueDates.map((dateStr) => new Date(dateStr))

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
 * @param userId - User ID
 * @param mandalartId - Optional mandalart ID to filter by
 */
export async function getGoalProgress(userId: string, mandalartId?: string): Promise<GoalProgress[]> {
  // Get all sub-goals with their actions and checks
  let query = supabase
    .from('sub_goals')
    .select(
      `
      id,
      title,
      position,
      mandalart:mandalarts!inner(
        id,
        title,
        user_id,
        is_active
      ),
      actions(
        id,
        check_history(checked_at)
      )
    `
    )
    .eq('mandalart.user_id', userId)
    .eq('mandalart.is_active', true)
    .order('position')

  // Add mandalart filter if provided
  if (mandalartId) {
    query = query.eq('mandalart.id', mandalartId)
  }

  const { data: subGoals, error } = await query

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
      weeklyPercentage: totalActions > 0 ? Math.round((checkedThisWeek / (totalActions * 7)) * 100) : 0,
      mandalartId: sg.mandalart?.id,
      mandalartTitle: sg.mandalart?.title
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

  // High achievement (80%+) - AI 코치 유도
  if (today.percentage >= 80) {
    return {
      title: '완벽해요! 🎉',
      message: `오늘 ${today.percentage}% 달성! AI 코치와 함께 더 나은 목표를 계획해보세요.`,
      emoji: '🎉',
      variant: 'success',
      showAIButton: true
    }
  }

  // Very good progress (60-79%)
  if (today.percentage >= 60) {
    return {
      title: '정말 잘하고 있어요!',
      message: `오늘 ${today.percentage}% 달성! AI 코치와 성과를 분석해보실래요?`,
      emoji: '✨',
      variant: 'success',
      showAIButton: true
    }
  }

  // Good streak (7일+)
  if (current >= 7) {
    return {
      title: '연속 실천 중!',
      message: `${current}일 연속 실천 중입니다! 꾸준함이 힘이에요!`,
      emoji: '🔥',
      variant: 'success'
    }
  }

  // Good weekly progress (50-59%)
  if (week.percentage >= 50) {
    return {
      title: '좋은 진행이에요!',
      message: `이번 주 ${week.percentage}% 완료! 계속 이대로 가세요!`,
      emoji: '👍',
      variant: 'success'
    }
  }

  // Moderate progress (30-49%)
  if (today.percentage >= 30) {
    return {
      title: '잘하고 있어요!',
      message: `오늘 ${today.checked}개 완료! 조금만 더 힘내봐요!`,
      emoji: '⭐',
      variant: 'info'
    }
  }

  // Low progress (10-29%) - 동기부여
  if (today.percentage >= 10) {
    return {
      title: '작은 시작이 중요해요',
      message: '한 걸음씩 나아가고 있어요. 오늘 하나만 더 체크해볼까요?',
      emoji: '💪',
      variant: 'info'
    }
  }

  // Very low progress (<10%) - 강한 동기부여
  if (today.percentage < 10) {
    return {
      title: '시작이 반입니다!',
      message: '작은 실천 하나가 큰 변화를 만듭니다. 오늘 하나만 체크해보세요!',
      emoji: '🌱',
      variant: 'warning'
    }
  }

  // Default
  return {
    title: '오늘도 화이팅!',
    message: '목표를 향한 작은 실천이 쌓이고 있어요. 꾸준히 해나가봐요!',
    emoji: '🌟',
    variant: 'info'
  }
}

// ============================================================================
// GAMIFICATION FUNCTIONS
// ============================================================================

/**
 * XP Calculation Formula:
 * - Base: 10 XP per check
 * - Streak bonus: +5 XP per check when on streak (7+ days)
 * - Perfect day bonus: +50 XP when 100% completion
 * - Perfect week bonus: +200 XP when weekly 80%+
 */

export interface XPCalculation {
  baseXP: number
  streakBonus: number
  perfectDayBonus: number
  totalXP: number
}

/**
 * Calculate XP earned from today's activity
 */
export async function calculateTodayXP(userId: string): Promise<XPCalculation> {
  const completionStats = await getCompletionStats(userId)
  const streakStats = await getStreakStats(userId)

  const todayChecks = completionStats.today.checked
  const baseXP = todayChecks * 10

  // Streak bonus: +5 XP per check if on 7+ day streak
  const streakBonus = streakStats.current >= 7 ? todayChecks * 5 : 0

  // Perfect day bonus: +50 XP if 100% completion
  const perfectDayBonus = completionStats.today.percentage === 100 ? 50 : 0

  return {
    baseXP,
    streakBonus,
    perfectDayBonus,
    totalXP: baseXP + streakBonus + perfectDayBonus
  }
}

/**
 * Calculate total XP from all-time check history
 */
export async function calculateTotalXP(userId: string): Promise<number> {
  // Get total check count
  const { count: totalChecks } = await supabase
    .from('check_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Base XP: 10 per check
  const baseXP = (totalChecks || 0) * 10

  // Get perfect days (100% completion days) for bonus XP
  const { data: checks } = await supabase
    .from('check_history')
    .select('checked_at')
    .eq('user_id', userId)

  if (!checks) return baseXP

  // Count perfect days (days with 100% completion)
  // This is a simplified calculation - in production, you'd want to store this
  // or calculate it properly by comparing daily checks vs total actions
  const perfectDayBonus = 0 // TODO: Implement proper perfect day tracking

  return baseXP + perfectDayBonus
}

/**
 * Level calculation from XP
 * Formula: Level = floor(sqrt(totalXP / 100)) + 1
 * Example: 0-99 XP = Level 1, 100-399 = Level 2, 400-899 = Level 3, etc.
 */
export function calculateLevelFromXP(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1
}

/**
 * Calculate XP needed for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  // Inverse of level formula: XP = (level - 1)^2 * 100
  return Math.pow(currentLevel, 2) * 100
}

/**
 * Calculate XP progress to next level
 */
export function getXPProgress(totalXP: number): {
  currentLevel: number
  currentLevelXP: number
  nextLevelXP: number
  progressXP: number
  progressPercentage: number
} {
  const currentLevel = calculateLevelFromXP(totalXP)
  const currentLevelXP = Math.pow(currentLevel - 1, 2) * 100
  const nextLevelXP = Math.pow(currentLevel, 2) * 100
  const progressXP = totalXP - currentLevelXP
  const neededXP = nextLevelXP - currentLevelXP
  const progressPercentage = Math.round((progressXP / neededXP) * 100)

  return {
    currentLevel,
    currentLevelXP,
    nextLevelXP,
    progressXP,
    progressPercentage
  }
}

/**
 * Get or create user level record
 */
export async function getUserLevel(userId: string) {
  const { data, error } = await supabase
    .from('user_levels')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // Create initial level record
    const totalXP = await calculateTotalXP(userId)
    const level = calculateLevelFromXP(totalXP)

    const { data: newLevel, error: insertError } = await supabase
      .from('user_levels')
      .insert({ user_id: userId, level, total_xp: totalXP })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user level:', insertError)
      return null
    }

    return newLevel
  }

  return data
}

/**
 * Update user XP and level
 */
export async function updateUserXP(userId: string, xpToAdd: number) {
  const currentLevel = await getUserLevel(userId)
  if (!currentLevel) return null

  // Prevent negative XP (minimum is 0)
  const newTotalXP = Math.max(0, currentLevel.total_xp + xpToAdd)
  const newLevel = calculateLevelFromXP(newTotalXP)

  const { data, error } = await supabase
    .from('user_levels')
    .update({
      total_xp: newTotalXP,
      level: newLevel
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user XP:', error)
    return null
  }

  // Return level up status
  return {
    ...data,
    leveledUp: newLevel > currentLevel.level,
    oldLevel: currentLevel.level,
    xpGained: xpToAdd
  }
}

// ============================================================================
// ACHIEVEMENT CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if user meets criteria for a specific achievement
 */
export async function checkAchievementUnlock(
  userId: string,
  _achievementKey: string,
  unlockCondition: any
): Promise<boolean> {
  const { type } = unlockCondition

  switch (type) {
    case 'streak': {
      const streakStats = await getStreakStats(userId)
      return streakStats.current >= unlockCondition.days || streakStats.longest >= unlockCondition.days
    }

    case 'perfect_day': {
      // Count days with 100% completion
      // This requires checking daily completion history
      // For now, simplified check
      const completionStats = await getCompletionStats(userId)
      return completionStats.today.percentage === 100
    }

    case 'perfect_week': {
      const completionStats = await getCompletionStats(userId)
      return completionStats.week.percentage >= (unlockCondition.threshold || 80)
    }

    case 'perfect_month': {
      const completionStats = await getCompletionStats(userId)
      return completionStats.month.percentage >= (unlockCondition.threshold || 90)
    }

    case 'total_checks': {
      const { count } = await supabase
        .from('check_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      return (count || 0) >= unlockCondition.count
    }

    case 'balanced': {
      const goalProgress = await getGoalProgress(userId)
      if (goalProgress.length === 0) return false
      // Check if all sub-goals meet threshold
      const threshold = unlockCondition.threshold || 60
      return goalProgress.every(goal => goal.weeklyPercentage >= threshold)
    }

    case 'time_pattern': {
      // Check time-of-day patterns (morning checks)
      const { data: checks } = await supabase
        .from('check_history')
        .select('checked_at')
        .eq('user_id', userId)

      if (!checks || checks.length === 0) return false

      const morningChecks = checks.filter(check => {
        const hour = new Date(check.checked_at).getHours()
        return hour >= 5 && hour < 12
      })

      const morningPercentage = (morningChecks.length / checks.length) * 100
      return morningPercentage >= (unlockCondition.threshold || 70)
    }

    case 'weekend_completion': {
      // Compare weekend vs weekday completion
      const { data: checks } = await supabase
        .from('check_history')
        .select('checked_at')
        .eq('user_id', userId)

      if (!checks || checks.length === 0) return false

      const weekendChecks = checks.filter(check => {
        const day = new Date(check.checked_at).getDay()
        return day === 0 || day === 6 // Sunday or Saturday
      })

      const weekdayChecks = checks.filter(check => {
        const day = new Date(check.checked_at).getDay()
        return day >= 1 && day <= 5
      })

      if (weekdayChecks.length === 0) return false

      const weekendRate = weekendChecks.length / 2 // 2 days (Sat, Sun)
      const weekdayRate = weekdayChecks.length / 5 // 5 days (Mon-Fri)

      return weekendRate > weekdayRate
    }

    default:
      return false
  }
}

/**
 * Check all achievements for a user and unlock new ones
 */
export async function checkAndUnlockAchievements(userId: string) {
  // Get all achievements
  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('*')
    .order('display_order')

  if (achievementsError || !achievements) {
    console.error('Error fetching achievements:', achievementsError)
    return []
  }

  // Get user's current achievements
  const { data: userAchievements, error: userAchievementsError } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)

  if (userAchievementsError) {
    console.error('Error fetching user achievements:', userAchievementsError)
    return []
  }

  const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
  const newlyUnlocked = []

  // Check each achievement
  for (const achievement of achievements) {
    // Skip if already unlocked
    if (unlockedIds.has(achievement.id)) continue

    // Check if criteria met
    const unlocked = await checkAchievementUnlock(userId, achievement.key, achievement.unlock_condition)

    if (unlocked) {
      // Unlock achievement
      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id
        })

      if (!insertError) {
        // Award XP
        await updateUserXP(userId, achievement.xp_reward)
        newlyUnlocked.push(achievement)
      }
    }
  }

  return newlyUnlocked
}

// ============================================================================
// PATTERN ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze user's check patterns by day of week
 */
export async function analyzeWeekdayPatterns(userId: string) {
  const { data: checks, error } = await supabase
    .from('check_history')
    .select('checked_at')
    .eq('user_id', userId)

  if (error || !checks || checks.length === 0) {
    return null
  }

  // Group by day of week
  const dayGroups: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  checks.forEach(check => {
    const day = new Date(check.checked_at).getDay()
    dayGroups[day]++
  })

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const sortedDays = Object.entries(dayGroups)
    .map(([day, count]) => ({
      day: parseInt(day),
      dayName: dayNames[parseInt(day)],
      count
    }))
    .sort((a, b) => b.count - a.count)

  return {
    bestDay: sortedDays[0],
    worstDay: sortedDays[sortedDays.length - 1],
    allDays: sortedDays
  }
}

/**
 * Analyze user's check patterns by time of day
 */
export async function analyzeTimePatterns(userId: string) {
  const { data: checks, error } = await supabase
    .from('check_history')
    .select('checked_at')
    .eq('user_id', userId)

  if (error || !checks || checks.length === 0) {
    return null
  }

  // Group by time period
  const periods = {
    morning: 0,   // 5-12
    afternoon: 0, // 12-18
    evening: 0,   // 18-22
    night: 0      // 22-5
  }

  checks.forEach(check => {
    const hour = new Date(check.checked_at).getHours()
    if (hour >= 5 && hour < 12) periods.morning++
    else if (hour >= 12 && hour < 18) periods.afternoon++
    else if (hour >= 18 && hour < 22) periods.evening++
    else periods.night++
  })

  const total = checks.length
  return {
    morning: { count: periods.morning, percentage: Math.round((periods.morning / total) * 100) },
    afternoon: { count: periods.afternoon, percentage: Math.round((periods.afternoon / total) * 100) },
    evening: { count: periods.evening, percentage: Math.round((periods.evening / total) * 100) },
    night: { count: periods.night, percentage: Math.round((periods.night / total) * 100) }
  }
}

/**
 * Get daily completion data for heatmap (last N days)
 */
export async function getDailyCompletionData(userId: string, days: number = 365) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get all checks in period
  const { data: checks, error } = await supabase
    .from('check_history')
    .select('checked_at')
    .eq('user_id', userId)
    .gte('checked_at', startDate.toISOString())

  if (error) {
    console.error('Error fetching check history:', error)
    return []
  }

  // Get total actions per day (need this for completion percentage)
  const totalActions = await getTotalActionsCount(userId)

  // Group by date
  const dateMap: Record<string, number> = {}
  checks?.forEach(check => {
    const date = new Date(check.checked_at)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    dateMap[dateStr] = (dateMap[dateStr] || 0) + 1
  })

  // Convert to array with completion percentages
  return Object.entries(dateMap).map(([date, count]) => ({
    date,
    count,
    percentage: totalActions > 0 ? Math.round((count / totalActions) * 100) : 0
  }))
}
