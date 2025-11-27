/**
 * XP (Experience Points) calculation utilities
 * Shared between web and mobile apps
 */

/**
 * Calculate the XP required to reach a specific level
 * Uses a hybrid log curve for smooth progression
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 0) return 0
  if (level === 1) return 100
  if (level === 2) return 200
  // Hybrid log curve for higher levels
  const baseXP = 100
  const scaleFactor = 1.8
  return Math.floor(baseXP * Math.pow(level, scaleFactor))
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP: number): number {
  let level = 1
  while (calculateXPForLevel(level + 1) <= totalXP) {
    level++
  }
  return level
}

/**
 * Get XP progress for current level
 */
export function getXPForCurrentLevel(
  totalXP: number,
  level: number
): { current: number; required: number; percentage: number } {
  const xpForCurrentLevel = calculateXPForLevel(level)
  const xpForNextLevel = calculateXPForLevel(level + 1)
  const xpProgress = totalXP - xpForCurrentLevel
  const xpRequired = xpForNextLevel - xpForCurrentLevel
  const percentage = xpRequired > 0 ? Math.round((xpProgress / xpRequired) * 100) : 0

  return {
    current: Math.max(0, xpProgress),
    required: xpRequired,
    percentage,
  }
}

/**
 * Get total XP required to reach next level
 */
export function getXPToNextLevel(totalXP: number, level: number): number {
  const xpForNextLevel = calculateXPForLevel(level + 1)
  return Math.max(0, xpForNextLevel - totalXP)
}

/**
 * Format level display string
 */
export function formatLevel(level: number): string {
  return `Lv.${level}`
}

/**
 * Format XP display string
 */
export function formatXP(xp: number): string {
  if (xp >= 10000) {
    return `${(xp / 1000).toFixed(1)}k`
  }
  return xp.toLocaleString()
}
