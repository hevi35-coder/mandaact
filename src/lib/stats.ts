// Statistics calculation utilities for MandaAct

import { supabase } from './supabase'
import { utcToUserDate, getUserToday } from './timezone'
import { getActiveMultipliers, calculateTotalMultiplier, activateLevelMilestoneBonus, type XPMultiplier } from './xpMultipliers'

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
  longestStreakDate: Date | null
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

// Type definitions for SubGoal and Action with check history
interface CheckHistory {
  checked_at: string
}

interface Action {
  id: string
  check_history?: CheckHistory[]
}

interface SubGoal {
  id: string
  title: string
  position: number
  actions?: Action[]
  mandalart?: {
    id: string
    title: string
  } | {
    id: string
    title: string
    user_id: string
    is_active: boolean
  }[]
}

// Type definition for achievement unlock condition
export interface UnlockCondition {
  type: string
  days?: number
  threshold?: number
  count?: number
  [key: string]: unknown
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
      lastCheckDate: null,
      longestStreakDate: null
    }
  }

  // Get actual last check time (with full timestamp)
  const lastCheckDate = checks.length > 0 ? new Date(checks[0].checked_at) : null

  // Extract unique dates (convert UTC to user's local date in YYYY-MM-DD format)
  const uniqueDates = Array.from(
    new Set(
      checks.map((check) => utcToUserDate(check.checked_at))
    )
  ).sort((a, b) => b.localeCompare(a)) // Sort descending

  if (uniqueDates.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastCheckDate: null,
      longestStreakDate: null
    }
  }

  // Parse dates for streak calculation
  const dates = uniqueDates.map((dateStr) => new Date(dateStr))

  // Calculate current streak using timezone-aware date comparison
  let currentStreak = 0
  const todayStr = getUserToday()
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStr = utcToUserDate(yesterdayDate.toISOString())

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
        expectedDateStr = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`
      } else {
        break
      }
    }
  }

  // Calculate longest streak and track the end date
  let longestStreak = 0
  let tempStreak = 1
  let longestStreakEndIndex = 0  // Track where longest streak ends

  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i])
    const next = new Date(dates[i + 1])
    current.setHours(0, 0, 0, 0)
    next.setHours(0, 0, 0, 0)

    const diffDays = Math.round((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      tempStreak++
    } else {
      if (tempStreak >= longestStreak) {
        longestStreak = tempStreak
        longestStreakEndIndex = i  // Most recent date of the longest streak
      }
      tempStreak = 1
    }
  }

  // Final check for last streak (use >= to update with most recent streak when tied)
  if (tempStreak >= longestStreak) {
    longestStreak = tempStreak
    longestStreakEndIndex = dates.length - 1
  }

  // Get the timestamp of the last check during the longest streak
  let longestStreakDate: Date | null = null
  if (longestStreak > 0) {
    // If current streak matches or exceeds longest streak, use current streak's date
    if (currentStreak >= longestStreak) {
      longestStreakDate = lastCheckDate
    } else {
      // Otherwise, find the date from historical longest streak
      const longestStreakDateStr = uniqueDates[longestStreakEndIndex]
      // Find the last check on that date (most recent timestamp) using timezone-aware comparison
      const checksOnThatDay = checks.filter((check) => {
        return utcToUserDate(check.checked_at) === longestStreakDateStr
      })
      if (checksOnThatDay.length > 0) {
        longestStreakDate = new Date(checksOnThatDay[0].checked_at) // Already sorted desc
      }
    }
  }

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCheckDate,
    longestStreakDate
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

  return subGoals.map((sg: SubGoal) => {
    const totalActions = sg.actions?.length || 0

    // Count unique actions checked today
    const checkedToday = new Set(
      sg.actions
        ?.filter((action: Action) =>
          action.check_history?.some((check: CheckHistory) => {
            const checkDate = new Date(check.checked_at)
            return checkDate >= today && checkDate < tomorrow
          })
        )
        .map((action: Action) => action.id)
    ).size

    // Count unique actions checked this week
    const checkedThisWeek = new Set(
      sg.actions
        ?.filter((action: Action) =>
          action.check_history?.some((check: CheckHistory) => {
            const checkDate = new Date(check.checked_at)
            return checkDate >= weekStart
          })
        )
        .map((action: Action) => action.id)
    ).size

    const mandalart = Array.isArray(sg.mandalart) ? sg.mandalart[0] : sg.mandalart

    return {
      subGoalId: sg.id,
      subGoalTitle: sg.title,
      position: sg.position,
      totalActions,
      checkedToday,
      checkedThisWeek,
      weeklyPercentage: totalActions > 0 ? Math.round((checkedThisWeek / (totalActions * 7)) * 100) : 0,
      mandalartId: mandalart?.id,
      mandalartTitle: mandalart?.title
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
  multipliers?: XPMultiplier[]
  multipliedXP?: number
}

/**
 * Calculate XP earned from today's activity (with multipliers)
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

  const subtotalXP = baseXP + streakBonus + perfectDayBonus

  // Apply multipliers
  const multipliers = await getActiveMultipliers(userId)
  const totalMultiplier = calculateTotalMultiplier(multipliers)
  const multipliedXP = Math.floor(subtotalXP * totalMultiplier)

  return {
    baseXP,
    streakBonus,
    perfectDayBonus,
    totalXP: multipliedXP,
    multipliers,
    multipliedXP
  }
}

/**
 * Calculate total XP from all-time check history
 */
export async function calculateTotalXP(userId: string): Promise<number> {
  // Get user level data which includes total_xp
  const { data: userLevel } = await supabase
    .from('user_levels')
    .select('total_xp')
    .eq('user_id', userId)
    .single()

  return userLevel?.total_xp || 0
}

/**
 * Check and award Perfect Day XP bonus
 * Calls RPC function to check if user completed all actions for today
 * Awards +50 XP if perfect day and not already awarded
 */
export async function checkAndAwardPerfectDayXP(
  userId: string,
  date?: string
): Promise<{
  is_perfect_day: boolean
  total_actions: number
  completed_actions: number
  xp_awarded: number
  already_awarded: boolean
  date: string
}> {
  const { data, error } = await supabase.rpc('check_and_award_perfect_day_xp', {
    p_user_id: userId,
    p_date: date || new Date().toISOString().split('T')[0]
  })

  if (error) {
    console.error('Error checking perfect day:', error)
    return {
      is_perfect_day: false,
      total_actions: 0,
      completed_actions: 0,
      xp_awarded: 0,
      already_awarded: false,
      date: date || new Date().toISOString().split('T')[0]
    }
  }

  return data
}

/**
 * Get total count of perfect days (days with 100% completion)
 * Uses last_perfect_day_date to track awarded perfect days
 */
export async function getPerfectDaysCount(userId: string): Promise<number> {
  // Get user level data
  const { data: userLevel } = await supabase
    .from('user_levels')
    .select('last_perfect_day_date, total_xp')
    .eq('user_id', userId)
    .single()

  if (!userLevel) return 0

  // Estimate perfect days from total XP
  // Each perfect day = +50 XP bonus
  // This is an approximation - for accurate tracking, you'd need a separate table
  // For now, we'll just check if there was at least one perfect day
  return userLevel.last_perfect_day_date ? 1 : 0
}

/**
 * Level calculation from XP
 * Hybrid logarithmic curve for balanced progression:
 * - Levels 1-2: Fast start (quadratic, same as before)
 * - Levels 3-5: Medium progression (power 1.7)
 * - Levels 6+: Smooth growth (logarithmic)
 */
export function calculateLevelFromXP(totalXP: number): number {
  if (totalXP < 100) {
    // Level 1
    return 1
  } else if (totalXP < 400) {
    // Level 2: Keep fast initial progression
    return 2
  } else if (totalXP < 2500) {
    // Levels 3-5: Medium progression (power 1.7)
    // Adjusted XP = totalXP - 400 (starting from level 3)
    const adjustedXP = totalXP - 400
    return Math.floor(Math.pow(adjustedXP / 100, 1 / 1.7)) + 3
  } else {
    // Levels 6+: Logarithmic progression for smooth late game
    // Adjusted XP = totalXP - 2500 (starting from level 6)
    const adjustedXP = totalXP - 2500
    return Math.floor(Math.log(adjustedXP / 150 + 1) * 8) + 6
  }
}

/**
 * Calculate XP needed for next level
 * Inverse of the hybrid level formula
 */
export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel <= 0) {
    return 0 // Level 0 starts at 0 XP
  } else if (currentLevel === 1) {
    return 100
  } else if (currentLevel === 2) {
    return 400
  } else if (currentLevel <= 5) {
    // Power 1.7 inverse: XP = (level - 3)^1.7 * 100 + 400
    return Math.floor(Math.pow(currentLevel - 3, 1.7) * 100) + 400
  } else {
    // Logarithmic inverse: XP = (e^((level - 6) / 8) - 1) * 150 + 2500
    return Math.floor((Math.exp((currentLevel - 6) / 8) - 1) * 150) + 2500
  }
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
  const currentLevelXP = getXPForNextLevel(currentLevel - 1)
  const nextLevelXP = getXPForNextLevel(currentLevel)
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

  // Check for level milestone bonus activation
  const leveledUp = newLevel > currentLevel.level
  if (leveledUp) {
    await activateLevelMilestoneBonus(userId, newLevel)
  }

  // Return level up status
  return {
    ...data,
    leveledUp,
    oldLevel: currentLevel.level,
    xpGained: xpToAdd
  }
}

// ============================================================================
// ACHIEVEMENT CHECKING FUNCTIONS
// ============================================================================

/**
 * Stats cache for achievement checking optimization
 */
export interface StatsCache {
  streak?: StreakStats
  completion?: CompletionStats
  goalProgress?: GoalProgress[]
  totalChecks?: number
  checks?: { checked_at: string }[]
}

/**
 * Check if user meets criteria for a specific achievement
 * @param cache Optional pre-computed stats to avoid redundant queries
 */
export async function checkAchievementUnlock(
  userId: string,
  _achievementKey: string,
  unlockCondition: UnlockCondition,
  cache?: StatsCache
): Promise<boolean> {
  const { type } = unlockCondition

  switch (type) {
    case 'streak': {
      const streakStats = cache?.streak ?? await getStreakStats(userId)
      const days = unlockCondition.days ?? 0
      return streakStats.current >= days || streakStats.longest >= days
    }

    case 'perfect_day': {
      // Count days with 100% completion
      // This requires checking daily completion history
      // For now, simplified check
      const completionStats = cache?.completion ?? await getCompletionStats(userId)
      return completionStats.today.percentage === 100
    }

    case 'perfect_week': {
      const completionStats = cache?.completion ?? await getCompletionStats(userId)
      return completionStats.week.percentage >= (unlockCondition.threshold || 80)
    }

    case 'perfect_month': {
      const completionStats = cache?.completion ?? await getCompletionStats(userId)
      return completionStats.month.percentage >= (unlockCondition.threshold || 90)
    }

    case 'total_checks': {
      let totalChecks = cache?.totalChecks
      if (totalChecks === undefined) {
        const { count } = await supabase
          .from('check_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        totalChecks = count || 0
      }
      const requiredCount = unlockCondition.count ?? 0
      return totalChecks >= requiredCount
    }

    case 'balanced': {
      const goalProgress = cache?.goalProgress ?? await getGoalProgress(userId)
      if (goalProgress.length === 0) return false
      // Check if all sub-goals meet threshold
      const threshold = unlockCondition.threshold || 60
      return goalProgress.every(goal => goal.weeklyPercentage >= threshold)
    }

    case 'time_pattern': {
      // Check time-of-day patterns (morning checks)
      let checks = cache?.checks
      if (!checks) {
        const { data } = await supabase
          .from('check_history')
          .select('checked_at')
          .eq('user_id', userId)
        checks = data || []
      }

      if (checks.length === 0) return false

      const morningChecks = checks.filter(check => {
        const hour = new Date(check.checked_at).getHours()
        return hour >= 5 && hour < 12
      })

      const morningPercentage = (morningChecks.length / checks.length) * 100
      return morningPercentage >= (unlockCondition.threshold || 70)
    }

    case 'weekend_completion': {
      // Compare weekend vs weekday completion
      let checks = cache?.checks
      if (!checks) {
        const { data } = await supabase
          .from('check_history')
          .select('checked_at')
          .eq('user_id', userId)
        checks = data || []
      }

      if (checks.length === 0) return false

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

    case 'monthly_completion': {
      const completionStats = cache?.completion ?? await getCompletionStats(userId)
      return completionStats.month.percentage >= (unlockCondition.threshold || 90)
    }

    case 'perfect_week_in_month': {
      // Check if user had at least one perfect week in the current month
      // This requires checking weekly completion for the past 4 weeks
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      // Check each week of the month
      let hasPerfectWeek = false
      for (let weekOffset = 0; weekOffset < 5; weekOffset++) {
        const weekStart = new Date(monthStart)
        weekStart.setDate(monthStart.getDate() + (weekOffset * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)

        if (weekEnd > now) break // Don't check future weeks

        // Get completion for this week
        const weekCompletion = await getCompletionStatsForPeriod(userId, weekStart, weekEnd)
        if (weekCompletion.percentage === 100) {
          hasPerfectWeek = true
          break
        }
      }

      return hasPerfectWeek
    }

    case 'monthly_streak': {
      const streakStats = cache?.streak ?? await getStreakStats(userId)
      // Check if current streak is at least the required days (30 for monthly)
      return streakStats.current >= (unlockCondition.days || 30)
    }

    default:
      return false
  }
}

/**
 * Get completion stats for a specific period
 */
async function getCompletionStatsForPeriod(userId: string, start: Date, end: Date) {
  // Get total actions
  const totalActions = await getTotalActionsCount(userId)

  // Get checks in period
  const { data: checks } = await supabase
    .from('check_history')
    .select('id')
    .eq('user_id', userId)
    .gte('checked_at', start.toISOString())
    .lt('checked_at', end.toISOString())

  const checked = checks?.length || 0
  const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const total = totalActions * daysInPeriod

  return {
    checked,
    total,
    percentage: total > 0 ? (checked / total) * 100 : 0
  }
}

/**
 * Check all achievements for a user and unlock new ones (optimized with parallel execution and caching)
 */
export async function checkAndUnlockAchievements(userId: string) {
  const startTime = performance.now()

  // Get all achievements and user achievements in parallel
  const [achievementsRes, userAchievementsRes] = await Promise.all([
    supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)  // ✅ OPTIMIZATION: Filter active badges only
      .order('display_order'),
    supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)
  ])

  if (achievementsRes.error || !achievementsRes.data) {
    console.error('Error fetching achievements:', achievementsRes.error)
    return []
  }

  if (userAchievementsRes.error) {
    console.error('Error fetching user achievements:', userAchievementsRes.error)
    return []
  }

  const achievements = achievementsRes.data
  const unlockedIds = new Set(userAchievementsRes.data?.map(ua => ua.achievement_id) || [])

  // Filter out already unlocked badges to reduce work
  const unlockedAchievements = achievements.filter(a => !unlockedIds.has(a.id))
  console.log(`🔍 Checking ${unlockedAchievements.length} unlocked badges (${achievements.length - unlockedAchievements.length} already unlocked)`)

  // ✅ OPTIMIZATION: Determine which stats are needed based on active unlocked badges
  const neededStats = new Set<keyof StatsCache>()
  unlockedAchievements.forEach(achievement => {
    const { type } = achievement.unlock_condition

    switch (type) {
      case 'streak':
      case 'monthly_streak':
        neededStats.add('streak')
        break

      case 'perfect_day':
      case 'perfect_week':
      case 'perfect_month':
      case 'monthly_completion':
      case 'perfect_week_in_month':
        neededStats.add('completion')
        break

      case 'balanced':
        neededStats.add('goalProgress')
        break

      case 'total_checks':
        neededStats.add('totalChecks')
        break

      case 'time_pattern':
      case 'weekend_completion':
        neededStats.add('checks')
        break
    }
  })

  console.log(`📊 Computing conditional stats: [${Array.from(neededStats).join(', ')}]`)

  // ✅ OPTIMIZATION: Build conditional stats cache (only compute what's needed)
  const cacheStartTime = performance.now()
  const promises: Promise<any>[] = []
  const keys: (keyof StatsCache)[] = []

  if (neededStats.has('streak')) {
    keys.push('streak')
    promises.push(getStreakStats(userId))
  }

  if (neededStats.has('completion')) {
    keys.push('completion')
    promises.push(getCompletionStats(userId))
  }

  if (neededStats.has('goalProgress')) {
    keys.push('goalProgress')
    promises.push(getGoalProgress(userId))
  }

  if (neededStats.has('totalChecks')) {
    keys.push('totalChecks')
    promises.push(
      supabase.from('check_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .then(({ count }) => count || 0)
    )
  }

  if (neededStats.has('checks')) {
    keys.push('checks')
    promises.push(
      supabase.from('check_history')
        .select('checked_at')
        .eq('user_id', userId)
        .then(({ data }) => data || [])
    )
  }

  const results = await Promise.all(promises)

  const statsCache: StatsCache = {}
  keys.forEach((key, index) => {
    statsCache[key] = results[index]
  })

  console.log(`✅ Stats cache ready in ${(performance.now() - cacheStartTime).toFixed(0)}ms`)

  // Check all unlocked achievements in parallel with cache
  console.log(`🔍 Checking ${unlockedAchievements.length} achievements in parallel...`)
  const checkStartTime = performance.now()

  const checkResults = await Promise.all(
    unlockedAchievements.map(async (achievement) => {
      // Check if criteria met (with cache)
      const unlocked = await checkAchievementUnlock(
        userId,
        achievement.key,
        achievement.unlock_condition,
        statsCache
      )

      return { achievement, unlocked }
    })
  )

  console.log(`✅ Checks completed in ${(performance.now() - checkStartTime).toFixed(0)}ms`)

  // Process newly unlocked achievements
  const newlyUnlocked = []

  for (const { achievement, unlocked } of checkResults) {
    if (!unlocked) continue

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

  const totalTime = (performance.now() - startTime).toFixed(0)
  console.log(`🏆 Badge check complete in ${totalTime}ms (${newlyUnlocked.length} newly unlocked)`)

  return newlyUnlocked
}

/**
 * Calculate progress toward unlocking a specific badge
 * Returns progress value (0-100) and current/target values
 */
export async function calculateBadgeProgress(
  userId: string,
  _achievementKey: string,
  unlockCondition: UnlockCondition
): Promise<{ progress: number; current: number; target: number } | null> {
  const { type } = unlockCondition

  switch (type) {
    case 'streak': {
      const streakStats = await getStreakStats(userId)
      const target = unlockCondition.days ?? 1
      const current = Math.max(streakStats.current, streakStats.longest)
      return {
        progress: Math.min((current / target) * 100, 100),
        current,
        target
      }
    }

    case 'total_checks': {
      const { count } = await supabase
        .from('check_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      const target = unlockCondition.count ?? 1
      const current = count || 0
      return {
        progress: Math.min((current / target) * 100, 100),
        current,
        target
      }
    }

    case 'perfect_week': {
      // Count weeks with threshold% completion
      // This is an approximation - would need detailed weekly tracking
      const completionStats = await getCompletionStats(userId)
      const threshold = unlockCondition.threshold || 80
      const target = unlockCondition.count ?? 1
      const current = completionStats.week.percentage >= threshold ? 1 : 0
      return {
        progress: Math.min((current / target) * 100, 100),
        current,
        target
      }
    }

    case 'perfect_month':
    case 'monthly_completion': {
      const completionStats = await getCompletionStats(userId)
      const threshold = unlockCondition.threshold || 90
      const current = completionStats.month.percentage
      return {
        progress: Math.min((current / threshold) * 100, 100),
        current: Math.round(current),
        target: threshold
      }
    }

    case 'monthly_streak': {
      const streakStats = await getStreakStats(userId)
      const target = unlockCondition.days || 30
      const current = streakStats.current
      return {
        progress: Math.min((current / target) * 100, 100),
        current,
        target
      }
    }

    // For complex conditions, don't show progress
    case 'balanced':
    case 'time_pattern':
    case 'weekend_completion':
    case 'perfect_week_in_month':
      return null

    default:
      return null
  }
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
