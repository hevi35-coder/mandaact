/**
 * XP Multiplier System
 *
 * Provides dynamic XP bonuses based on various conditions:
 * - Weekend bonus: 1.5x on Saturdays and Sundays
 * - Comeback bonus: 1.5x for 3 days after returning from 3+ day absence
 * - Level milestone bonus: 2x for 7 days after reaching levels 5, 10, 15, 20
 * - Perfect week bonus: 2x for 7 days after achieving 80%+ weekly completion
 */

import { supabase } from './supabase'
import { getUserToday } from './timezone'

export interface XPMultiplier {
  type: 'weekend' | 'comeback' | 'level_milestone' | 'perfect_week'
  name: string
  multiplier: number
  active: boolean
  daysRemaining?: number
  description: string
}

/**
 * Get all active XP multipliers for a user
 */
export async function getActiveMultipliers(userId: string): Promise<XPMultiplier[]> {
  const multipliers: XPMultiplier[] = []

  // 1. Weekend bonus (always check, no duration)
  const today = new Date()
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  if (isWeekend) {
    multipliers.push({
      type: 'weekend',
      name: '주말 보너스',
      multiplier: 1.5,
      active: true,
      description: '주말에는 XP 1.5배!'
    })
  }

  // 2. Comeback bonus (3+ days absence, lasts 3 days)
  const comebackMultiplier = await checkComebackBonus(userId)
  if (comebackMultiplier) {
    multipliers.push(comebackMultiplier)
  }

  // 3. Level milestone bonus (levels 5, 10, 15, 20 - lasts 7 days)
  const milestoneMultiplier = await checkLevelMilestoneBonus(userId)
  if (milestoneMultiplier) {
    multipliers.push(milestoneMultiplier)
  }

  // 4. Perfect week bonus (80%+ completion last week - lasts 7 days)
  const perfectWeekMultiplier = await checkPerfectWeekBonus(userId)
  if (perfectWeekMultiplier) {
    multipliers.push(perfectWeekMultiplier)
  }

  return multipliers
}

/**
 * Calculate total multiplier (stacks additively, not multiplicatively)
 * Example: 1.5x + 2.0x = 3.5x total
 */
export function calculateTotalMultiplier(multipliers: XPMultiplier[]): number {
  if (multipliers.length === 0) return 1.0

  // Sum all multipliers additively
  const totalMultiplier = multipliers.reduce((sum, m) => sum + m.multiplier, 0)

  return totalMultiplier
}

/**
 * Check comeback bonus: 1.5x for 3 days after 3+ day absence
 */
async function checkComebackBonus(userId: string): Promise<XPMultiplier | null> {
  const today = getUserToday()

  // Check if comeback bonus is already active in user_bonus_xp table
  const { data: bonusData } = await supabase
    .from('user_bonus_xp')
    .select('*')
    .eq('user_id', userId)
    .eq('bonus_type', 'comeback')
    .gte('expires_at', new Date().toISOString())
    .single()

  if (bonusData) {
    // Calculate days remaining
    const expiresAt = new Date(bonusData.expires_at)
    const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    return {
      type: 'comeback',
      name: '컴백 보너스',
      multiplier: 1.5,
      active: true,
      daysRemaining,
      description: `복귀 환영! ${daysRemaining}일간 XP 1.5배`
    }
  }

  // Check if user qualifies for new comeback bonus (3+ day absence)
  const { data: recentChecks } = await supabase
    .from('check_history')
    .select('checked_at')
    .eq('user_id', userId)
    .order('checked_at', { ascending: false })
    .limit(1)

  if (!recentChecks || recentChecks.length === 0) {
    return null // No check history
  }

  const lastCheckDate = new Date(recentChecks[0].checked_at)
  const daysSinceLastCheck = Math.floor((Date.now() - lastCheckDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceLastCheck >= 3) {
    // Activate comeback bonus for 3 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 3)

    await supabase
      .from('user_bonus_xp')
      .insert({
        user_id: userId,
        bonus_type: 'comeback',
        multiplier: 1.5,
        activated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })

    return {
      type: 'comeback',
      name: '컴백 보너스',
      multiplier: 1.5,
      active: true,
      daysRemaining: 3,
      description: '복귀 환영! 3일간 XP 1.5배'
    }
  }

  return null
}

/**
 * Check level milestone bonus: 2x for 7 days after reaching levels 5, 10, 15, 20
 */
async function checkLevelMilestoneBonus(userId: string): Promise<XPMultiplier | null> {
  // Check if milestone bonus is already active
  const { data: bonusData } = await supabase
    .from('user_bonus_xp')
    .select('*')
    .eq('user_id', userId)
    .eq('bonus_type', 'level_milestone')
    .gte('expires_at', new Date().toISOString())
    .single()

  if (bonusData) {
    const expiresAt = new Date(bonusData.expires_at)
    const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    return {
      type: 'level_milestone',
      name: '레벨 마일스톤',
      multiplier: 2.0,
      active: true,
      daysRemaining,
      description: `레벨 달성 축하! ${daysRemaining}일간 XP 2배`
    }
  }

  return null
}

/**
 * Activate level milestone bonus when user reaches milestone level
 * Should be called from level up logic
 */
export async function activateLevelMilestoneBonus(userId: string, level: number): Promise<boolean> {
  const milestones = [5, 10, 15, 20, 25, 30]

  if (!milestones.includes(level)) {
    return false // Not a milestone level
  }

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
}

/**
 * Check perfect week bonus: 2x for 7 days after achieving 80%+ weekly completion
 */
async function checkPerfectWeekBonus(userId: string): Promise<XPMultiplier | null> {
  // Check if perfect week bonus is already active
  const { data: bonusData } = await supabase
    .from('user_bonus_xp')
    .select('*')
    .eq('user_id', userId)
    .eq('bonus_type', 'perfect_week')
    .gte('expires_at', new Date().toISOString())
    .single()

  if (bonusData) {
    const expiresAt = new Date(bonusData.expires_at)
    const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

    return {
      type: 'perfect_week',
      name: '완벽한 주',
      multiplier: 2.0,
      active: true,
      daysRemaining,
      description: `지난 주 80% 달성! ${daysRemaining}일간 XP 2배`
    }
  }

  return null
}

/**
 * Activate perfect week bonus when user achieves 80%+ weekly completion
 * Should be called from weekly stats calculation
 */
export async function activatePerfectWeekBonus(userId: string): Promise<boolean> {
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
}

/**
 * Format multiplier display
 */
export function formatMultiplier(multiplier: number): string {
  return `×${multiplier.toFixed(1)}`
}

/**
 * Get multiplier color for UI
 */
export function getMultiplierColor(type: XPMultiplier['type']): string {
  switch (type) {
    case 'weekend':
      return 'text-blue-500'
    case 'comeback':
      return 'text-green-500'
    case 'level_milestone':
      return 'text-yellow-500'
    case 'perfect_week':
      return 'text-purple-500'
    default:
      return 'text-primary'
  }
}
