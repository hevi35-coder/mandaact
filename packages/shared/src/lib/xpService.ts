/**
 * XP Service with Dependency Injection
 * Shared between web and mobile apps
 */

import { getLevelFromXP } from './xpUtils'
import { format } from 'date-fns'
import { utcToUserDate, getUserToday } from './timezone'

// Type definitions for Supabase client (simplified)
interface SupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => any
    insert: (data: any) => any
    update: (data: any) => any
    delete: () => any
    upsert: (data: any) => any
  }
  rpc: (fn: string, params?: any) => Promise<{ data: any; error: any }>
}

// ============================================================================
// Types
// ============================================================================

export interface StreakStats {
  current: number
  longest: number
  lastCheckDate: Date | null
  longestStreakDate: Date | null
}

export interface XPUserLevel {
  level: number
  total_xp: number
}

export interface UpdateXPResult {
  success: boolean
  newLevel?: number
  oldLevel?: number
  leveledUp?: boolean
  newTotalXP?: number
}

export interface PerfectDayResult {
  is_perfect_day: boolean
  xp_awarded: number
  total_actions: number
  completed_actions: number
}

export interface XPMultiplier {
  type: 'weekend' | 'comeback' | 'level_milestone' | 'perfect_week'
  name: string
  multiplier: number
}

export interface AwardXPResult {
  finalXP: number
  multipliers: XPMultiplier[]
  leveledUp: boolean
}

export interface XPService {
  // Core XP functions
  getUserLevel: (userId: string) => Promise<XPUserLevel | null>
  updateUserXP: (userId: string, xpToAdd: number) => Promise<UpdateXPResult>

  // Streak functions
  getStreakStats: (userId: string) => Promise<StreakStats>

  // Multiplier functions
  getActiveMultipliers: (userId: string) => Promise<XPMultiplier[]>
  calculateTotalMultiplier: (multipliers: XPMultiplier[]) => number

  // Bonus functions
  checkAndAwardPerfectDayXP: (userId: string, dateStr?: string) => Promise<PerfectDayResult>

  // Bonus activation functions
  activateLevelMilestoneBonus: (userId: string, level: number) => Promise<boolean>
  activatePerfectWeekBonus: (userId: string) => Promise<boolean>
  checkComebackBonus: (userId: string) => Promise<boolean>

  // Combined award function
  awardXP: (userId: string, baseXP?: number) => Promise<AwardXPResult>
}

// ============================================================================
// Service Factory
// ============================================================================

export function createXPService(supabase: SupabaseClient): XPService {

  /**
   * Get or create user level record
   */
  async function getUserLevel(userId: string): Promise<XPUserLevel | null> {
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
            console.error('Error creating user level:', insertError)
            return null
          }
          return newData
        }
        console.error('Error fetching user level:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getUserLevel:', error)
      return null
    }
  }

  /**
   * Update user XP and level
   */
  async function updateUserXP(userId: string, xpToAdd: number): Promise<UpdateXPResult> {
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
        console.error('Error updating user XP:', error)
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
      console.error('Error in updateUserXP:', error)
      return { success: false }
    }
  }

  /**
   * Get streak statistics for a user
   * Uses proper timezone-aware date calculations (same as web)
   */
  async function getStreakStats(userId: string): Promise<StreakStats> {
    try {
      const { data: checks, error } = await supabase
        .from('check_history')
        .select('checked_at')
        .eq('user_id', userId)
        .order('checked_at', { ascending: false })

      if (error || !checks || checks.length === 0) {
        return { current: 0, longest: 0, lastCheckDate: null, longestStreakDate: null }
      }

      // Store actual last check timestamp (for display)
      const lastCheckDate = checks.length > 0 ? new Date(checks[0].checked_at) : null

      // Extract unique dates using proper timezone conversion
      const dateStrings: string[] = checks.map((check: { checked_at: string }) => utcToUserDate(check.checked_at))
      const uniqueDatesSet = new Set<string>(dateStrings)
      const uniqueDates: string[] = [...uniqueDatesSet].sort((a, b) => b.localeCompare(a)) // Sort descending

      if (uniqueDates.length === 0) {
        return { current: 0, longest: 0, lastCheckDate: null, longestStreakDate: null }
      }

      // Get today and yesterday using proper timezone
      const todayStr = getUserToday()
      const yesterdayDate = new Date()
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayStr = utcToUserDate(yesterdayDate.toISOString())

      // Calculate current streak
      let currentStreak = 0
      const lastCheckDateStr = uniqueDates[0]

      // Only count current streak if last check was today or yesterday
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

      // Calculate longest streak and track the end date
      const dates: Date[] = uniqueDates.map((dateStr) => new Date(dateStr))
      let longestStreak = 0
      let tempStreak = 1
      let longestStreakEndIndex = 0
      let tempStreakStartIndex = 0

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
            longestStreakEndIndex = tempStreakStartIndex
          }
          tempStreak = 1
          tempStreakStartIndex = i + 1
        }
      }

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak
        longestStreakEndIndex = tempStreakStartIndex
      }

      // Get the most recent date of the longest streak period
      const longestStreakDateStr = uniqueDates[longestStreakEndIndex]
      let longestStreakDate: Date | null = null

      if (longestStreakDateStr) {
        // Find the most recent check on that date
        for (const check of checks) {
          if (utcToUserDate(check.checked_at) === longestStreakDateStr) {
            longestStreakDate = new Date(check.checked_at)
            break
          }
        }
      }

      return {
        current: currentStreak,
        longest: longestStreak,
        lastCheckDate,
        longestStreakDate
      }
    } catch (error) {
      console.error('Error getting streak stats:', error)
      return { current: 0, longest: 0, lastCheckDate: null, longestStreakDate: null }
    }
  }

  /**
   * Get active XP multipliers for a user
   */
  async function getActiveMultipliers(userId: string): Promise<XPMultiplier[]> {
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
      console.error('Error fetching multipliers:', error)
    }

    return multipliers
  }

  /**
   * Calculate total multiplier (stacks additively)
   */
  function calculateTotalMultiplier(multipliers: XPMultiplier[]): number {
    if (multipliers.length === 0) return 1.0
    return multipliers.reduce((sum, m) => sum + m.multiplier, 0)
  }

  /**
   * Check and award perfect day XP bonus (+50 XP if 100% completion)
   */
  async function checkAndAwardPerfectDayXP(
    userId: string,
    dateStr?: string
  ): Promise<PerfectDayResult> {
    try {
      const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd')

      const { data, error } = await supabase.rpc('check_and_award_perfect_day_xp', {
        p_user_id: userId,
        p_date: targetDate
      })

      if (error) {
        console.error('Error checking perfect day:', error)
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
      console.error('Error in checkAndAwardPerfectDayXP:', error)
      return {
        is_perfect_day: false,
        xp_awarded: 0,
        total_actions: 0,
        completed_actions: 0
      }
    }
  }

  /**
   * Activate level milestone bonus: 2x for 7 days after reaching levels 5, 10, 15, 20, 25, 30
   */
  async function activateLevelMilestoneBonus(userId: string, level: number): Promise<boolean> {
    const milestones = [5, 10, 15, 20, 25, 30]

    if (!milestones.includes(level)) {
      return false // Not a milestone level
    }

    try {
      // Check if already activated for this level
      const { data: existing } = await supabase
        .from('user_bonus_xp')
        .select('*')
        .eq('user_id', userId)
        .eq('bonus_type', 'level_milestone')
        .gte('expires_at', new Date().toISOString())

      if (existing && existing.length > 0) {
        return false // Already active
      }

      // Activate for 7 days
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase
        .from('user_bonus_xp')
        .insert({
          user_id: userId,
          bonus_type: 'level_milestone',
          multiplier: 2.0,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          metadata: { level }
        })

      return !error
    } catch (error) {
      console.error('Error activating level milestone bonus:', error)
      return false
    }
  }

  /**
   * Activate perfect week bonus: 2x for 7 days after achieving 80%+ weekly completion
   */
  async function activatePerfectWeekBonus(userId: string): Promise<boolean> {
    try {
      // Check if already activated this week
      const { data: existing } = await supabase
        .from('user_bonus_xp')
        .select('*')
        .eq('user_id', userId)
        .eq('bonus_type', 'perfect_week')
        .gte('expires_at', new Date().toISOString())

      if (existing && existing.length > 0) {
        return false // Already active
      }

      // Activate for 7 days
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase
        .from('user_bonus_xp')
        .insert({
          user_id: userId,
          bonus_type: 'perfect_week',
          multiplier: 2.0,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })

      return !error
    } catch (error) {
      console.error('Error activating perfect week bonus:', error)
      return false
    }
  }

  /**
   * Check and activate comeback bonus: 1.5x for 3 days after 3+ day absence
   */
  async function checkComebackBonus(userId: string): Promise<boolean> {
    try {
      // Check if comeback bonus is already active
      const { data: bonusData } = await supabase
        .from('user_bonus_xp')
        .select('*')
        .eq('user_id', userId)
        .eq('bonus_type', 'comeback')
        .gte('expires_at', new Date().toISOString())
        .maybeSingle()

      if (bonusData) {
        return false // Already active
      }

      // Check if user qualifies for new comeback bonus (3+ day absence)
      const { data: recentChecks } = await supabase
        .from('check_history')
        .select('checked_at')
        .eq('user_id', userId)
        .order('checked_at', { ascending: false })
        .limit(1)

      if (!recentChecks || recentChecks.length === 0) {
        return false // No check history
      }

      const lastCheckDate = new Date(recentChecks[0].checked_at)
      const daysSinceLastCheck = Math.floor((Date.now() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceLastCheck >= 3) {
        // Activate comeback bonus for 3 days
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 3)

        const { error } = await supabase
          .from('user_bonus_xp')
          .insert({
            user_id: userId,
            bonus_type: 'comeback',
            multiplier: 1.5,
            activated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString()
          })

        return !error
      }

      return false
    } catch (error) {
      console.error('Error checking comeback bonus:', error)
      return false
    }
  }

  /**
   * Award XP with streak bonus and multipliers
   * Also checks and activates level milestone bonus on level up
   */
  async function awardXP(userId: string, baseXP: number = 10): Promise<AwardXPResult> {
    // Check comeback bonus first (before awarding XP)
    await checkComebackBonus(userId)

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

    // Check for level milestone bonus activation on level up
    if (result.leveledUp && result.newLevel) {
      await activateLevelMilestoneBonus(userId, result.newLevel)
    }

    return {
      finalXP,
      multipliers,
      leveledUp: result.leveledUp || false
    }
  }

  // Return service object
  return {
    getUserLevel,
    updateUserXP,
    getStreakStats,
    getActiveMultipliers,
    calculateTotalMultiplier,
    checkAndAwardPerfectDayXP,
    activateLevelMilestoneBonus,
    activatePerfectWeekBonus,
    checkComebackBonus,
    awardXP
  }
}
