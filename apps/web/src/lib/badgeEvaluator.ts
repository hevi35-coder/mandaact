/**
 * Badge Auto-Evaluation System
 * Evaluates badge unlock conditions and automatically unlocks achieved badges
 */

import { supabase } from './supabase'
import type { Achievement } from '@/types'

export interface BadgeEvaluationResult {
  badgeKey: string
  badgeTitle: string
  wasUnlocked: boolean
  xpAwarded: number
  progress: number
  emotionalMessage?: string
}

/**
 * Evaluate all badges for a user and unlock any that are completed
 */
export async function evaluateAndUnlockBadges(userId: string): Promise<BadgeEvaluationResult[]> {
  const results: BadgeEvaluationResult[] = []

  try {
    // Get all achievements
    const { data: allBadges } = await supabase
      .from('achievements')
      .select('*')
      .order('display_order', { ascending: true })

    if (!allBadges || allBadges.length === 0) {
      return results
    }

    // Get already unlocked badges
    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)

    const unlockedBadgeIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])

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

      const progress = progressData as { current: number; target: number; progress: number; completed: boolean }

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
export async function evaluateSingleBadge(
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

    const progress = progressData as { current: number; target: number; progress: number; completed: boolean }

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
export async function getBadgeProgress(
  userId: string,
  badge: Achievement
): Promise<{ current: number; target: number; progress: number; completed: boolean } | null> {
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

    return data as { current: number; target: number; progress: number; completed: boolean }
  } catch (error) {
    console.error('Error getting badge progress:', error)
    return null
  }
}
