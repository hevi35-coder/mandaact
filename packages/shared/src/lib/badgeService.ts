/**
 * Badge Service with Dependency Injection
 * Shared between web and mobile apps
 */

import type { Achievement, AchievementUnlockCondition } from '../types'

// Type definitions for Supabase client (simplified)
interface SupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => any
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
  getNewlyUnlockedBadges: (userId: string, sinceTimestamp: string) => Promise<BadgeEvaluationResult[]>
  getUserBadgeIds: (userId: string) => Promise<string[]>
}

// ============================================================================
// Service Factory
// ============================================================================

export function createBadgeService(supabase: SupabaseClient): BadgeService {

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

      const unlockedBadgeIds = new Set(userAchievements?.map((ua: { achievement_id: string }) => ua.achievement_id) || [])

      // Evaluate each badge
      for (const badge of allBadges) {
        // Skip if already unlocked and not repeatable
        if (unlockedBadgeIds.has(badge.id) && !badge.is_repeatable) {
          continue
        }

        // Evaluate badge progress using RPC function
        const { data: progressData, error: progressError } = await supabase.rpc(
          'evaluate_badge_progress',
          {
            p_user_id: userId,
            p_achievement_id: badge.id,
            p_unlock_condition: badge.unlock_condition
          }
        )

        if (progressError) {
          console.error(`Error evaluating badge ${badge.key}:`, progressError)
          continue
        }

        const progress = progressData as BadgeProgress

        // If completed, try to unlock
        if (progress.completed) {
          const { data: unlockResult, error: unlockError } = await supabase.rpc(
            'unlock_achievement',
            {
              p_user_id: userId,
              p_achievement_id: badge.id,
              p_xp_reward: badge.xp_reward
            }
          )

          if (unlockError) {
            console.error(`Error unlocking badge ${badge.key}:`, unlockError)
            continue
          }

          // If successfully unlocked (returns true)
          if (unlockResult === true) {
            results.push({
              badgeKey: badge.key,
              badgeTitle: badge.title,
              wasUnlocked: true,
              xpAwarded: badge.xp_reward,
              progress: progress.progress,
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
      // Evaluate progress
      const { data: progressData, error: progressError } = await supabase.rpc(
        'evaluate_badge_progress',
        {
          p_user_id: userId,
          p_achievement_id: badge.id,
          p_unlock_condition: badge.unlock_condition
        }
      )

      if (progressError) {
        console.error(`Error evaluating badge ${badge.key}:`, progressError)
        return null
      }

      const progress = progressData as BadgeProgress

      // If not completed, return null
      if (!progress.completed) {
        return null
      }

      // Try to unlock
      const { data: unlockResult, error: unlockError } = await supabase.rpc(
        'unlock_achievement',
        {
          p_user_id: userId,
          p_achievement_id: badge.id,
          p_xp_reward: badge.xp_reward
        }
      )

      if (unlockError) {
        console.error(`Error unlocking badge ${badge.key}:`, unlockError)
        return null
      }

      // If successfully unlocked
      if (unlockResult === true) {
        return {
          badgeKey: badge.key,
          badgeTitle: badge.title,
          wasUnlocked: true,
          xpAwarded: badge.xp_reward,
          progress: progress.progress,
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
      const { data, error } = await supabase.rpc(
        'evaluate_badge_progress',
        {
          p_user_id: userId,
          p_achievement_id: badge.id,
          p_unlock_condition: badge.unlock_condition
        }
      )

      if (error) {
        console.error(`Error getting badge progress for ${badge.key}:`, error)
        return null
      }

      return data as BadgeProgress
    } catch (error) {
      console.error('Error getting badge progress:', error)
      return null
    }
  }

  /**
   * Get user's current badge IDs (for comparison before/after check)
   */
  async function getUserBadgeIds(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching user badge IDs:', error)
        return []
      }

      return data?.map((ua: { achievement_id: string }) => ua.achievement_id) || []
    } catch (error) {
      console.error('Error in getUserBadgeIds:', error)
      return []
    }
  }

  /**
   * Get badges unlocked since a specific timestamp
   * This detects badges awarded by DB triggers (e.g., first_check)
   */
  async function getNewlyUnlockedBadges(userId: string, sinceTimestamp: string): Promise<BadgeEvaluationResult[]> {
    const results: BadgeEvaluationResult[] = []

    try {
      // Get achievements unlocked since the timestamp
      const { data: recentUnlocks, error: unlocksError } = await supabase
        .from('user_achievements')
        .select(`
          achievement_id,
          unlocked_at,
          achievement:achievements (
            id,
            key,
            title,
            xp_reward,
            emotional_message
          )
        `)
        .eq('user_id', userId)
        .gte('unlocked_at', sinceTimestamp)

      if (unlocksError) {
        console.error('Error fetching recent unlocks:', unlocksError)
        return results
      }

      // Convert to BadgeEvaluationResult format
      for (const unlock of recentUnlocks || []) {
        const achievement = unlock.achievement as any
        if (achievement) {
          results.push({
            badgeKey: achievement.key,
            badgeTitle: achievement.title,
            wasUnlocked: true,
            xpAwarded: achievement.xp_reward,
            progress: 100,
            emotionalMessage: achievement.emotional_message
          })
        }
      }

      return results
    } catch (error) {
      console.error('Error in getNewlyUnlockedBadges:', error)
      return results
    }
  }

  // Return service object
  return {
    evaluateAndUnlockBadges,
    evaluateSingleBadge,
    getBadgeProgress,
    getNewlyUnlockedBadges,
    getUserBadgeIds
  }
}
