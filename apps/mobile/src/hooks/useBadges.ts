import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

// Query keys
export const badgeKeys = {
  all: ['badges'] as const,
  definitions: () => [...badgeKeys.all, 'definitions'] as const,
  userBadges: (userId: string | undefined) =>
    [...badgeKeys.all, 'user', userId] as const,
  progress: (userId: string | undefined) =>
    [...badgeKeys.all, 'progress', userId] as const,
}

// Badge categories
export const BADGE_CATEGORIES = {
  practice: { id: 'practice', name: '실천', icon: '✅', color: '#22c55e' },
  streak: { id: 'streak', name: '스트릭', icon: '🔥', color: '#f59e0b' },
  consistency: { id: 'consistency', name: '꾸준함', icon: '📅', color: '#3b82f6' },
  monthly: { id: 'monthly', name: '월간', icon: '🌙', color: '#8b5cf6' },
  completion: { id: 'completion', name: '완주', icon: '🏆', color: '#ec4899' },
  special: { id: 'special', name: '특별', icon: '⭐', color: '#06b6d4' },
} as const

// Badge definitions
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Practice
  { id: 'first_check', category: 'practice', name: '첫 실천', description: '첫 번째 실천 체크', icon: '🌱', xp_reward: 50, target: 1 },
  { id: 'checks_10', category: 'practice', name: '10회 실천', description: '총 10회 실천 완료', icon: '🌿', xp_reward: 100, target: 10 },
  { id: 'checks_100', category: 'practice', name: '100회 실천', description: '총 100회 실천 완료', icon: '🌳', xp_reward: 500, target: 100 },
  { id: 'checks_1000', category: 'practice', name: '1000회 실천', description: '총 1000회 실천 완료', icon: '🏔️', xp_reward: 2000, target: 1000 },

  // Streak
  { id: 'streak_7', category: 'streak', name: '1주 연속', description: '7일 연속 실천', icon: '🔥', xp_reward: 150, target: 7 },
  { id: 'streak_30', category: 'streak', name: '1달 연속', description: '30일 연속 실천', icon: '💪', xp_reward: 500, target: 30 },
  { id: 'streak_60', category: 'streak', name: '2달 연속', description: '60일 연속 실천', icon: '⚡', xp_reward: 1000, target: 60 },
  { id: 'streak_100', category: 'streak', name: '100일 연속', description: '100일 연속 실천', icon: '🌟', xp_reward: 2000, target: 100 },
  { id: 'streak_150', category: 'streak', name: '150일 연속', description: '150일 연속 실천', icon: '👑', xp_reward: 3000, target: 150 },

  // Consistency
  { id: 'active_7', category: 'consistency', name: '1주 활동', description: '일주일간 활동', icon: '📆', xp_reward: 100, target: 7 },
  { id: 'active_30', category: 'consistency', name: '1달 활동', description: '한 달간 활동', icon: '📅', xp_reward: 300, target: 30 },
  { id: 'active_60', category: 'consistency', name: '2달 활동', description: '두 달간 활동', icon: '🗓️', xp_reward: 600, target: 60 },
  { id: 'active_100', category: 'consistency', name: '100일 활동', description: '100일간 활동', icon: '📊', xp_reward: 1000, target: 100 },

  // Monthly
  { id: 'monthly_80', category: 'monthly', name: '월간 80%', description: '이번 달 80% 달성', icon: '🎯', xp_reward: 300, target: 80, repeatable: true },
  { id: 'monthly_90', category: 'monthly', name: '월간 90%', description: '이번 달 90% 달성', icon: '💫', xp_reward: 500, target: 90, repeatable: true },
  { id: 'monthly_perfect', category: 'monthly', name: '월간 퍼펙트', description: '이번 달 100% 달성', icon: '✨', xp_reward: 1000, target: 100, repeatable: true },
  { id: 'monthly_active', category: 'monthly', name: '월간 개근', description: '이번 달 매일 활동', icon: '🏅', xp_reward: 500, target: 30, repeatable: true },

  // Completion
  { id: 'complete_subgoal', category: 'completion', name: '세부목표 완주', description: '세부 목표 하나 완료', icon: '🎖️', xp_reward: 200, target: 1 },
  { id: 'complete_mandalart', category: 'completion', name: '만다라트 완주', description: '만다라트 전체 완료', icon: '🏆', xp_reward: 1000, target: 1 },

  // Special
  { id: 'early_bird', category: 'special', name: '얼리버드', description: '오전 6시 이전 실천', icon: '🌅', xp_reward: 100, target: 1 },
  { id: 'night_owl', category: 'special', name: '올빼미', description: '자정 이후 실천', icon: '🦉', xp_reward: 100, target: 1 },
]

// Types
export interface BadgeDefinition {
  id: string  // UUID from DB (or string key for fallback)
  key?: string  // String key (e.g., 'first_check')
  category: keyof typeof BADGE_CATEGORIES
  name: string
  description: string
  icon: string
  xp_reward: number
  target: number
  repeatable?: boolean
  hint_level?: 'full' | 'cryptic' | 'hidden'
  unlock_condition?: {
    type: string
    days?: number
    count?: number
    threshold?: number
    period?: string
  }
}

export interface UserBadge {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  repeat_count?: number
}

export interface BadgeProgress {
  badge_id: string
  current: number
  target: number
  percentage: number
}

// Achievement type from DB
export interface Achievement {
  id: string  // UUID
  key: string
  title: string
  description: string
  icon: string
  category: string
  xp_reward: number
  unlock_condition: { type: string; count?: number; days?: number; threshold?: number }
  display_order: number
  is_repeatable?: boolean
  badge_type?: string
  hint_level?: string
  emotional_message?: string
}

// Get all badge definitions from DB (same as web)
export function useBadgeDefinitions() {
  return useQuery({
    queryKey: badgeKeys.definitions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) {
        logger.error('Error fetching achievements', { error })
        // Fall back to hardcoded definitions
        return BADGE_DEFINITIONS
      }

      // Map DB achievements to BadgeDefinition format
      return (data || []).map((ach: Achievement) => ({
        id: ach.id,  // Use UUID from DB
        key: ach.key,
        category: mapCategoryFromDB(ach.category),
        name: ach.title,
        description: ach.description,
        icon: ach.icon,
        xp_reward: ach.xp_reward,
        target: getTargetFromCondition(ach.unlock_condition),
        repeatable: ach.is_repeatable,
        hint_level: ach.hint_level as BadgeDefinition['hint_level'],
        unlock_condition: ach.unlock_condition,
      })) as BadgeDefinition[]
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Helper: Map DB category to local category keys
function mapCategoryFromDB(dbCategory: string): keyof typeof BADGE_CATEGORIES {
  const categoryMap: Record<string, keyof typeof BADGE_CATEGORIES> = {
    'volume': 'practice',
    'milestone': 'practice',
    'streak': 'streak',
    'consistency': 'consistency',
    'monthly': 'monthly',
    'completion': 'completion',
    'special': 'special',
  }
  return categoryMap[dbCategory] || 'special'
}

// Helper: Extract target from unlock condition
function getTargetFromCondition(condition: Achievement['unlock_condition']): number {
  if (condition.count) return condition.count
  if (condition.days) return condition.days
  if (condition.threshold) return condition.threshold
  return 1
}

// Get user's unlocked badges
export function useUserBadges(userId: string | undefined) {
  return useQuery({
    queryKey: badgeKeys.userBadges(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId!)
        .order('unlocked_at', { ascending: false })

      if (error) throw error
      return data as UserBadge[]
    },
    enabled: !!userId,
  })
}

// Get badge progress
export function useBadgeProgress(userId: string | undefined) {
  return useQuery({
    queryKey: badgeKeys.progress(userId),
    queryFn: async () => {
      // Call RPC function to get progress
      const { data, error } = await supabase.rpc('evaluate_badge_progress', {
        p_user_id: userId!,
      })

      if (error) {
        // If RPC doesn't exist, return empty progress
        logger.warn('Badge progress RPC not available', { error })
        return [] as BadgeProgress[]
      }

      return (data || []) as BadgeProgress[]
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Get badges by category
export function getBadgesByCategory(badges: BadgeDefinition[]) {
  return Object.keys(BADGE_CATEGORIES).reduce((acc, categoryId) => {
    acc[categoryId] = badges.filter(b => b.category === categoryId)
    return acc
  }, {} as Record<string, BadgeDefinition[]>)
}

// Check if badge is unlocked
export function isBadgeUnlocked(badgeId: string, userBadges: UserBadge[]): boolean {
  return userBadges.some(ub => ub.achievement_id === badgeId)
}

// Get badge unlock date
export function getBadgeUnlockDate(badgeId: string, userBadges: UserBadge[]): string | null {
  const badge = userBadges.find(ub => ub.achievement_id === badgeId)
  return badge?.unlocked_at || null
}

// Get badge repeat count
export function getBadgeRepeatCount(badgeId: string, userBadges: UserBadge[]): number {
  const badge = userBadges.find(ub => ub.achievement_id === badgeId)
  return badge?.repeat_count || 1
}
