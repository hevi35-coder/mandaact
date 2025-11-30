import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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

// Badge categories - names will be translated via hook
export const BADGE_CATEGORIES = {
  practice: { id: 'practice', nameKey: 'badges.categories.practice', icon: '✅', color: '#22c55e' },
  streak: { id: 'streak', nameKey: 'badges.categories.streak', icon: '🔥', color: '#f59e0b' },
  consistency: { id: 'consistency', nameKey: 'badges.categories.consistency', icon: '📅', color: '#3b82f6' },
  monthly: { id: 'monthly', nameKey: 'badges.categories.monthly', icon: '🌙', color: '#8b5cf6' },
  completion: { id: 'completion', nameKey: 'badges.categories.completion', icon: '🏆', color: '#ec4899' },
  special: { id: 'special', nameKey: 'badges.categories.special', icon: '⭐', color: '#06b6d4' },
  volume: { id: 'volume', nameKey: 'badges.categories.volume', icon: '💯', color: '#22c55e' },
  milestone: { id: 'milestone', nameKey: 'badges.categories.milestone', icon: '🌱', color: '#10b981' },
  secret: { id: 'secret', nameKey: 'badges.categories.secret', icon: '🌙', color: '#6366f1' },
  achievement: { id: 'achievement', nameKey: 'badges.categories.achievement', icon: '⭐', color: '#f59e0b' },
} as const

// Hook to get translated badge category name
export function useTranslatedBadgeCategories() {
  const { t } = useTranslation()
  return Object.entries(BADGE_CATEGORIES).reduce((acc, [key, value]) => {
    acc[key] = {
      ...value,
      name: t(value.nameKey),
    }
    return acc
  }, {} as Record<string, { id: string; name: string; icon: string; color: string }>)
}

// Hook to translate badge name and description
export function useTranslateBadge() {
  const { t, i18n } = useTranslation()

  return (badge: BadgeDefinition) => {
    const badgeKey = badge.key || badge.id
    const translatedName = t(`badges.names.${badgeKey}`, { defaultValue: badge.name })
    const translatedDesc = t(`badges.descriptions.${badgeKey}`, { defaultValue: badge.description })

    return {
      ...badge,
      name: translatedName,
      description: translatedDesc,
    }
  }
}

// Badge definitions - fallback if database is unavailable
// Note: These should match the database definitions (badge_system_v5_renewal.sql)
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Milestone (시작의 용기)
  { id: 'first_check', key: 'first_check', category: 'milestone', name: '첫 체크', description: '천 리 길도 한 걸음부터', icon: '🌱', xp_reward: 30, target: 1 },
  { id: 'first_mandalart', key: 'first_mandalart', category: 'milestone', name: '첫 만다라트', description: '목표를 그린 자만이 도달할 수 있다', icon: '🎯', xp_reward: 150, target: 1 },

  // Streak (시간의 여정)
  { id: 'streak_3', key: 'streak_3', category: 'streak', name: '3일의 시작', description: '모든 위대한 여정은 3일로부터 시작된다', icon: '🔥', xp_reward: 50, target: 3 },
  { id: 'streak_7', key: 'streak_7', category: 'streak', name: '7일의 약속', description: '나와의 첫 약속을 지켰다', icon: '🔥', xp_reward: 100, target: 7 },
  { id: 'streak_14', key: 'streak_14', category: 'streak', name: '14일의 전환점', description: '의지가 습관으로 전환되는 마법의 순간', icon: '⚡', xp_reward: 250, target: 14 },
  { id: 'streak_30', key: 'streak_30', category: 'streak', name: '30일의 리듬', description: '한 달의 리듬이 몸에 완전히 배었다', icon: '💪', xp_reward: 600, target: 30 },
  { id: 'streak_60', key: 'streak_60', category: 'streak', name: '60일의 관성', description: '노력 없이도 계속되는 관성의 힘', icon: '⚡', xp_reward: 1800, target: 60 },
  { id: 'streak_100', key: 'streak_100', category: 'streak', name: '100일의 증명', description: '백 일의 시간이 진정한 나를 증명한다', icon: '🌟', xp_reward: 3000, target: 100 },
  { id: 'streak_150', key: 'streak_150', category: 'streak', name: '150일의 마스터', description: '습관을 넘어 삶의 일부가 되다', icon: '👑', xp_reward: 5000, target: 150 },

  // Volume (반복의 미학)
  { id: 'checks_50', key: 'checks_50', category: 'volume', name: '첫 50회', description: '반복의 힘을 처음 발견한 순간', icon: '🌿', xp_reward: 100, target: 50 },
  { id: 'checks_100', key: 'checks_100', category: 'volume', name: '백 번의 실천', description: '꾸준함이 만드는 작은 기적', icon: '🌳', xp_reward: 250, target: 100 },
  { id: 'checks_250', key: 'checks_250', category: 'volume', name: '250회 달성', description: '습관이 완전한 일상이 되다', icon: '🌲', xp_reward: 500, target: 250 },
  { id: 'checks_500', key: 'checks_500', category: 'volume', name: '500회의 여정', description: '500번의 선택이 만든 새로운 나', icon: '🏔️', xp_reward: 1200, target: 500 },
  { id: 'checks_1000', key: 'checks_1000', category: 'volume', name: '천 번의 통찰', description: '천 번의 실천이 주는 깊은 깨달음', icon: '🏔️', xp_reward: 3500, target: 1000 },
  { id: 'checks_2500', key: 'checks_2500', category: 'volume', name: '2500회의 정상', description: '끈기의 정상에서 보는 풍경', icon: '🗻', xp_reward: 5000, target: 2500 },
  { id: 'checks_5000', key: 'checks_5000', category: 'volume', name: '5000회의 경지', description: '실천이 예술의 경지에 이르다', icon: '🏆', xp_reward: 8000, target: 5000 },

  // Monthly (매달의 도전)
  { id: 'monthly_90_percent', key: 'monthly_90_percent', category: 'monthly', name: '이달의 주인공', description: '이번 달의 주인공은 바로 나', icon: '⭐', xp_reward: 1000, target: 90, repeatable: true },
  { id: 'monthly_perfect_week', key: 'monthly_perfect_week', category: 'monthly', name: '완벽한 주', description: '일주일 내내 100% 달성한 완벽함', icon: '✨', xp_reward: 600, target: 100, repeatable: true },
  { id: 'monthly_streak_30', key: 'monthly_streak_30', category: 'monthly', name: '월간 마라톤', description: '한 달 내내 멈추지 않은 마라톤', icon: '🏃', xp_reward: 800, target: 30, repeatable: true },
  { id: 'monthly_champion', key: 'monthly_champion', category: 'monthly', name: '월간 그랜드슬램', description: '한 달 100% 완료, 완벽의 정의', icon: '🏆', xp_reward: 1500, target: 100, repeatable: true },

  // Secret (숨겨진 이야기)
  { id: 'midnight_warrior', key: 'midnight_warrior', category: 'secret', name: '심야의 수행자', description: '달이 가장 높은 시간에도 멈추지 않았다', icon: '🌙', xp_reward: 600, target: 1, hint_level: 'cryptic' },
  { id: 'mandalart_rainbow', key: 'mandalart_rainbow', category: 'secret', name: '일곱 빛깔', description: '모든 색이 조화를 이룰 때...', icon: '🌈', xp_reward: 800, target: 1, hint_level: 'cryptic' },
  { id: 'night_owl', key: 'night_owl', category: 'secret', name: '밤의 새', description: '밤의 고요 속에서 최고의 집중력을 발휘했다', icon: '🦉', xp_reward: 500, target: 1, hint_level: 'cryptic' },

  // Achievement (특별한 순간)
  { id: 'perfect_day', key: 'perfect_day', category: 'achievement', name: '오늘의 완성', description: '모든 목표를 달성한 완벽한 하루', icon: '✨', xp_reward: 100, target: 1 },
  { id: 'level_10', key: 'level_10', category: 'achievement', name: '성장의 나무', description: '레벨 10, 뿌리 깊은 나무가 되다', icon: '🌳', xp_reward: 500, target: 10 },
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
    'volume': 'volume',
    'milestone': 'milestone',
    'streak': 'streak',
    'consistency': 'consistency',
    'monthly': 'monthly',
    'completion': 'completion',
    'special': 'special',
    'secret': 'secret',
    'achievement': 'achievement',
    'practice': 'practice',
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
