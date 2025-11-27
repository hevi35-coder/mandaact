/**
 * XP (Experience Points) calculation utilities
 * Shared between web and mobile apps
 *
 * XP Progression System:
 * - Level 1: 0 → 100 XP
 * - Level 2: 100 → 400 XP
 * - Level 3-5: Power 1.7 curve
 * - Level 6+: Logarithmic for smooth late game
 */

/**
 * Calculate the XP threshold to reach a specific level
 * This is the minimum XP required to BE at that level
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) {
    return 0 // Level 1 starts at 0 XP
  } else if (level === 2) {
    return 100
  } else if (level === 3) {
    return 400
  } else if (level <= 6) {
    // Power 1.7 inverse: XP = (level - 3)^1.7 * 100 + 400
    return Math.floor(Math.pow(level - 3, 1.7) * 100) + 400
  } else {
    // Logarithmic inverse: XP = (e^((level - 6) / 8) - 1) * 150 + 2500
    return Math.floor((Math.exp((level - 6) / 8) - 1) * 150) + 2500
  }
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP: number): number {
  if (totalXP < 100) {
    // Level 1
    return 1
  } else if (totalXP < 400) {
    // Level 2: Keep fast initial progression
    return 2
  } else if (totalXP < 2500) {
    // Levels 3-5: Medium progression (power 1.7)
    // Adjusted XP = totalXP - 400 (starting from level 3)
    const adjustedXP = totalXP - 400
    return Math.floor(Math.pow(adjustedXP / 100, 1 / 1.7)) + 3
  } else {
    // Levels 6+: Logarithmic progression for smooth late game
    // Adjusted XP = totalXP - 2500 (starting from level 6)
    const adjustedXP = totalXP - 2500
    return Math.floor(Math.log(adjustedXP / 150 + 1) * 8) + 6
  }
}

/**
 * Get XP progress for current level
 * Returns current progress XP and required XP to reach next level
 */
export function getXPForCurrentLevel(
  totalXP: number,
  level: number
): { current: number; required: number; percentage: number } {
  const currentLevelXP = calculateXPForLevel(level)
  const nextLevelXP = calculateXPForLevel(level + 1)
  const progressXP = totalXP - currentLevelXP
  const requiredXP = nextLevelXP - currentLevelXP
  const percentage = requiredXP > 0 ? Math.round((progressXP / requiredXP) * 100) : 0

  return {
    current: Math.max(0, progressXP),
    required: requiredXP,
    percentage: Math.min(100, Math.max(0, percentage)),
  }
}

/**
 * Get total XP required to reach next level
 */
export function getXPToNextLevel(totalXP: number, level: number): number {
  const nextLevelXP = calculateXPForLevel(level + 1)
  return Math.max(0, nextLevelXP - totalXP)
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
