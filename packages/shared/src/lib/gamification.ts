import { getSupabase } from './supabase'

/**
 * User level data
 */
export interface UserLevel {
  user_id: string
  level: number
  total_xp: number
  nickname: string | null
  created_at: string
  updated_at: string
}

/**
 * Achievement data
 */
export interface Achievement {
  id: string
  title: string
  description: string
  category: string
  icon: string
  xp_reward: number
  unlock_condition: {
    type: string
    [key: string]: any
  }
  order_index: number
}

/**
 * User achievement data
 */
export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
}

/**
 * XP Multiplier data
 */
export interface XPMultiplier {
  id: string
  user_id: string
  multiplier_type: string
  multiplier_value: number
  active_until: string
  created_at: string
}

/**
 * Get user level and XP information
 */
export async function getUserLevel(
  userId: string
): Promise<UserLevel | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('user_levels')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Calculate level from total XP (Hybrid log curve)
 */
export function calculateLevelFromXP(totalXP: number): number {
  if (totalXP < 0) return 0
  if (totalXP === 0) return 1

  let level = 1
  let cumulativeXP = 0

  while (cumulativeXP <= totalXP) {
    const xpForNextLevel = calculateXPForLevel(level + 1)
    if (cumulativeXP + xpForNextLevel > totalXP) {
      break
    }
    cumulativeXP += xpForNextLevel
    level++
  }

  return level
}

/**
 * Calculate XP required for a specific level (Hybrid log curve)
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0
  if (level === 2) return 100

  // Zone-based adjustment
  const baseXP = 100 * Math.pow(level, 1.5)
  let adjustedXP = baseXP

  if (level >= 3 && level <= 10) {
    // Moderate curve (3-10)
    adjustedXP = baseXP * 0.8
  } else if (level >= 11) {
    // Gentle slope (11+)
    adjustedXP = baseXP * 0.5
  }

  return Math.round(adjustedXP)
}

/**
 * Get XP progress for current level
 */
export function getXPProgress(userLevel: UserLevel): {
  currentLevelXP: number
  nextLevelXP: number
  progress: number
} {
  const { level, total_xp } = userLevel

  // Calculate cumulative XP for current level
  let cumulativeXP = 0
  for (let i = 2; i <= level; i++) {
    cumulativeXP += calculateXPForLevel(i)
  }

  const currentLevelXP = total_xp - cumulativeXP
  const nextLevelXP = calculateXPForLevel(level + 1)
  const progress = nextLevelXP > 0 ? (currentLevelXP / nextLevelXP) * 100 : 0

  return {
    currentLevelXP,
    nextLevelXP,
    progress: Math.min(100, Math.max(0, progress)),
  }
}

/**
 * Get all achievements
 */
export async function getAchievements(): Promise<Achievement[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('order_index')

  if (error) {
    console.error('Failed to fetch achievements:', error)
    return []
  }

  return data || []
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(
  userId: string
): Promise<UserAchievement[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch user achievements:', error)
    return []
  }

  return data || []
}

/**
 * Get active XP multipliers for user
 */
export async function getActiveMultipliers(
  userId: string
): Promise<XPMultiplier[]> {
  const supabase = getSupabase()

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('xp_multipliers')
    .select('*')
    .eq('user_id', userId)
    .gt('active_until', now)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch XP multipliers:', error)
    return []
  }

  return data || []
}

/**
 * Get current streak for user
 */
export async function getCurrentStreak(userId: string): Promise<number> {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('get_current_streak', {
    p_user_id: userId,
  })

  if (error) {
    console.error('Failed to fetch current streak:', error)
    return 0
  }

  return data || 0
}
