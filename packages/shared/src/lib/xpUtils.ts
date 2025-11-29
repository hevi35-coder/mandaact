/**
 * XP (Experience Points) calculation utilities
 * Shared between web and mobile apps
 *
 * XP Progression System (Linear Increase +50 per level):
 * - Each level requires 50 more XP than the previous
 * - Level 1→2: 100 XP
 * - Level 2→3: 150 XP (+50)
 * - Level 3→4: 200 XP (+50)
 * - Level 4→5: 250 XP (+50)
 * - ...and so on
 *
 * Formula: Total XP for level n = 25*n² + 25*n - 50 (for n >= 2)
 * Required XP for level n→n+1 = 50*n + 50
 */

/**
 * Calculate the XP threshold to reach a specific level
 * This is the minimum XP required to BE at that level
 *
 * Level thresholds:
 * - Level 1: 0 XP
 * - Level 2: 100 XP (need 100)
 * - Level 3: 250 XP (need 150)
 * - Level 4: 450 XP (need 200)
 * - Level 5: 700 XP (need 250)
 * - Level 6: 1,000 XP (need 300)
 * - Level 7: 1,350 XP (need 350)
 * - Level 8: 1,750 XP (need 400)
 * - Level 9: 2,200 XP (need 450)
 * - Level 10: 2,700 XP (need 500)
 */
export function calculateXPForLevel(level: number): number {
  if (level <= 1) {
    return 0 // Level 1 starts at 0 XP
  }
  // Formula: 25*n² + 25*n - 50
  // This creates: 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700...
  return 25 * level * level + 25 * level - 50
}

/**
 * Calculate level from total XP
 * Inverse of calculateXPForLevel
 *
 * Given: XP = 25*level² + 25*level - 50
 * Rearrange: 25*level² + 25*level - (XP + 50) = 0
 * Using quadratic formula: level = (-25 + sqrt(625 + 100*(XP+50))) / 50
 */
export function getLevelFromXP(totalXP: number): number {
  if (totalXP < 100) {
    return 1
  }
  // Quadratic formula to find level from XP
  // 25*level² + 25*level - (XP + 50) = 0
  // level = (-25 + sqrt(625 + 100*XP + 5000)) / 50
  // level = (-25 + sqrt(5625 + 100*XP)) / 50
  const level = (-25 + Math.sqrt(5625 + 100 * totalXP)) / 50
  return Math.floor(level)
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
