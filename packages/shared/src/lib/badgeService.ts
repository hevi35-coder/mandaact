/**
 * Badge Service with Dependency Injection
 * Shared between web and mobile apps
 *
 * Uses JavaScript-based evaluation (same as web) instead of RPC
 * for consistent behavior across platforms
 */

import type { Achievement, AchievementUnlockCondition } from '../types'

// Type definitions for Supabase client (simplified)
interface SupabaseClient {
  from: (table: string) => {
    select: (columns?: string, options?: { count?: 'exact'; head?: boolean }) => any
    insert: (data: any) => any
    update: (data: any) => any
    delete: () => any
  }
  rpc: (fn: string, params?: any) => Promise<{ data: any; error: any }>
}

// ============================================================================
// Types (internal to badge service)
// ============================================================================

// Re-export Achievement type for convenience
export type { Achievement, AchievementUnlockCondition }

export interface BadgeProgress {
  current: number
  target: number
  progress: number
  completed: boolean
}

export interface BadgeEvaluationResult {
  badgeKey: string
  badgeTitle: string
  wasUnlocked: boolean
  xpAwarded: number
  progress: number
  emotionalMessage?: string
}

export interface BadgeService {
  evaluateAndUnlockBadges: (userId: string) => Promise<BadgeEvaluationResult[]>
  evaluateSingleBadge: (userId: string, badge: Achievement) => Promise<BadgeEvaluationResult | null>
  getBadgeProgress: (userId: string, badge: Achievement) => Promise<BadgeProgress | null>
}

// ============================================================================
// Service Factory
// ============================================================================

export function createBadgeService(supabase: SupabaseClient): BadgeService {

  /**
   * Check if user meets criteria for a specific achievement
   * JavaScript-based evaluation (same approach as web)
   */
  async function checkAchievementUnlock(
    userId: string,
    unlockCondition: AchievementUnlockCondition
  ): Promise<{ unlocked: boolean; current: number; target: number }> {
    const { type } = unlockCondition

    switch (type) {
      case 'total_checks': {
        // Get total check count for user
        const { count, error } = await supabase
          .from('check_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        if (error) {
          console.error('Error counting checks:', error)
          return { unlocked: false, current: 0, target: unlockCondition.count ?? 1 }
        }

        const totalChecks = count || 0
        const requiredCount = unlockCondition.count ?? 1
        return {
          unlocked: totalChecks >= requiredCount,
          current: totalChecks,
          target: requiredCount
        }
      }

      case 'streak': {
        // Get streak stats from user_levels or calculate
        const { data: streakData, error } = await supabase
          .from('user_levels')
          .select('user_id')
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching streak:', error)
        }

        // Calculate current streak from check_history
        const { data: checksData } = await supabase
          .from('check_history')
          .select('checked_at')
          .eq('user_id', userId)
          .order('checked_at', { ascending: false })
          .limit(100)

        const checks = checksData || []
        let currentStreak = 0

        if (checks.length > 0) {
          // Simple streak calculation: count consecutive days with checks
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const checkDates = new Set<string>()
          checks.forEach((check: { checked_at: string }) => {
            const date = new Date(check.checked_at)
            checkDates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`)
          })

          // Count streak backwards from today
          for (let i = 0; i <= checks.length; i++) {
            const checkDate = new Date(today)
            checkDate.setDate(today.getDate() - i)
            const dateKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`

            if (checkDates.has(dateKey)) {
              currentStreak++
            } else if (i > 0) {
              // Allow today to be missing (streak continues from yesterday)
              break
            }
          }
        }

        const requiredDays = unlockCondition.days ?? 1
        return {
          unlocked: currentStreak >= requiredDays,
          current: currentStreak,
          target: requiredDays
        }
      }

      case 'monthly_completion': {
        // Get current month completion rate
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        // Get checks this month
        const { count: checkCount } = await supabase
          .from('check_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('checked_at', monthStart.toISOString())
          .lt('checked_at', monthEnd.toISOString())

        // For simplicity, just count monthly checks vs target
        const currentChecks = checkCount || 0
        const threshold = unlockCondition.threshold ?? 80

        return {
          unlocked: currentChecks >= threshold, // Simplified
          current: currentChecks,
          target: threshold
        }
      }

      default:
        // Unknown type - use RPC as fallback
        return { unlocked: false, current: 0, target: 1 }
    }
  }

  /**
   * Unlock an achievement for user (direct insert + XP update)
   */
  async function unlockAchievement(
    userId: string,
    achievementId: string,
    xpReward: number
  ): Promise<boolean> {
    try {
      // Insert into user_achievements
      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievementId
        })

      if (insertError) {
        // Check if it's a duplicate error (already unlocked)
        if (insertError.code === '23505') {
          return false // Already unlocked
        }
        console.error('Error inserting user_achievement:', insertError)
        return false
      }

      // Award XP to user_levels using SELECT + UPDATE pattern
      if (xpReward > 0) {
        // Get current XP
        const { data: levelData, error: levelError } = await supabase
          .from('user_levels')
          .select('total_xp')
          .eq('user_id', userId)
          .single()

        if (!levelError && levelData) {
          // Update with new XP total
          const currentXP = levelData.total_xp || 0
          await supabase
            .from('user_levels')
            .update({ total_xp: currentXP + xpReward })
            .eq('user_id', userId)
        }
      }

      return true
    } catch (error) {
      console.error('Error unlocking achievement:', error)
      return false
    }
  }

  /**
   * Evaluate all badges for a user and unlock any that are completed
   */
  async function evaluateAndUnlockBadges(userId: string): Promise<BadgeEvaluationResult[]> {
    const results: BadgeEvaluationResult[] = []

    try {
      // Get all achievements
      const { data: allBadges, error: badgesError } = await supabase
        .from('achievements')
        .select('*')
        .order('display_order', { ascending: true })

      if (badgesError || !allBadges || allBadges.length === 0) {
        console.error('Error fetching achievements:', badgesError)
        return results
      }

      // Get already unlocked badges
      const { data: userAchievements, error: userAchError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId)

      if (userAchError) {
        console.error('Error fetching user achievements:', userAchError)
      }

      const unlockedBadgeIds = new Set(
        userAchievements?.map((ua: { achievement_id: string }) => ua.achievement_id) || []
      )

      // Evaluate each badge using JavaScript logic (same as web)
      for (const badge of allBadges) {
        // Skip if already unlocked and not repeatable
        if (unlockedBadgeIds.has(badge.id) && !badge.is_repeatable) {
          continue
        }

        // Evaluate badge progress using JavaScript (not RPC)
        const evaluation = await checkAchievementUnlock(userId, badge.unlock_condition)

        // If completed, try to unlock
        if (evaluation.unlocked) {
          const wasUnlocked = await unlockAchievement(userId, badge.id, badge.xp_reward)

          if (wasUnlocked) {
            results.push({
              badgeKey: badge.key,
              badgeTitle: badge.title,
              wasUnlocked: true,
              xpAwarded: badge.xp_reward,
              progress: 100,
              emotionalMessage: badge.emotional_message
            })
          }
        }
      }

      return results
    } catch (error) {
      console.error('Error in badge evaluation:', error)
      return results
    }
  }

  /**
   * Evaluate a single badge and try to unlock it
   */
  async function evaluateSingleBadge(
    userId: string,
    badge: Achievement
  ): Promise<BadgeEvaluationResult | null> {
    try {
      // Evaluate badge progress using JavaScript
      const evaluation = await checkAchievementUnlock(userId, badge.unlock_condition)

      // If not completed, return null
      if (!evaluation.unlocked) {
        return null
      }

      // Try to unlock
      const wasUnlocked = await unlockAchievement(userId, badge.id, badge.xp_reward)

      if (wasUnlocked) {
        return {
          badgeKey: badge.key,
          badgeTitle: badge.title,
          wasUnlocked: true,
          xpAwarded: badge.xp_reward,
          progress: 100,
          emotionalMessage: badge.emotional_message
        }
      }

      return null
    } catch (error) {
      console.error('Error in single badge evaluation:', error)
      return null
    }
  }

  /**
   * Get detailed progress for a badge (for display purposes)
   */
  async function getBadgeProgress(
    userId: string,
    badge: Achievement
  ): Promise<BadgeProgress | null> {
    try {
      const evaluation = await checkAchievementUnlock(userId, badge.unlock_condition)

      const progress = evaluation.target > 0
        ? Math.min(100, (evaluation.current / evaluation.target) * 100)
        : 0

      return {
        current: evaluation.current,
        target: evaluation.target,
        progress,
        completed: evaluation.unlocked
      }
    } catch (error) {
      console.error('Error getting badge progress:', error)
      return null
    }
  }

  // Return service object
  return {
    evaluateAndUnlockBadges,
    evaluateSingleBadge,
    getBadgeProgress
  }
}
