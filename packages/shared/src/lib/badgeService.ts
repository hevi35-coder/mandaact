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

  // Return service object
  return {
    evaluateAndUnlockBadges,
    evaluateSingleBadge,
    getBadgeProgress
  }
}
