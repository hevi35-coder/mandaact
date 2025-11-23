/**
 * Badge System v5.0 - Emotional Stage System
 * Maps XP rewards to emotional journey stages instead of traditional tiers
 */

export type BadgeStage = 'beginner' | 'forming' | 'growth' | 'mastery' | 'transcendence'

export interface BadgeStageInfo {
  stage: BadgeStage
  label: string
  labelEn: string
  emotion: string
  icon: string
  color: string
  textColor: string
  bgColor: string
  minXP: number
  maxXP: number
}

/**
 * Badge emotional stage definitions based on XP ranges
 */
export const BADGE_STAGES: Record<BadgeStage, BadgeStageInfo> = {
  beginner: {
    stage: 'beginner',
    label: '입문',
    labelEn: 'Beginner',
    emotion: '설렘·호기심',
    icon: '🌱',
    color: 'text-green-600',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    minXP: 0,
    maxXP: 150,
  },
  forming: {
    stage: 'forming',
    label: '형성',
    labelEn: 'Forming',
    emotion: '도전·의지',
    icon: '🔥',
    color: 'text-orange-600',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    minXP: 200,
    maxXP: 600,
  },
  growth: {
    stage: 'growth',
    label: '성장',
    labelEn: 'Growth',
    emotion: '몰입·리듬',
    icon: '⚡',
    color: 'text-blue-600',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    minXP: 800,
    maxXP: 1800,
  },
  mastery: {
    stage: 'mastery',
    label: '숙련',
    labelEn: 'Mastery',
    emotion: '자신감·통찰',
    icon: '💎',
    color: 'text-purple-600',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    minXP: 2000,
    maxXP: 5000,
  },
  transcendence: {
    stage: 'transcendence',
    label: '마스터',
    labelEn: 'Transcendence',
    emotion: '초월·예술',
    icon: '⭐',
    color: 'text-amber-600',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-50',
    minXP: 5000,
    maxXP: 10000,
  },
}

/**
 * Get badge stage based on XP reward
 */
export function getBadgeStage(xpReward: number): BadgeStageInfo {
  if (xpReward <= 150) return BADGE_STAGES.beginner
  if (xpReward <= 600) return BADGE_STAGES.forming
  if (xpReward <= 1800) return BADGE_STAGES.growth
  if (xpReward <= 5000) return BADGE_STAGES.mastery
  return BADGE_STAGES.transcendence
}

/**
 * Get stage label with icon
 */
export function getBadgeStageLabel(xpReward: number): string {
  const stage = getBadgeStage(xpReward)
  return `${stage.icon} ${stage.label}`
}

/**
 * Get stage label with emotion
 */
export function getBadgeStageLabelWithEmotion(xpReward: number): string {
  const stage = getBadgeStage(xpReward)
  return `${stage.icon} ${stage.label} · ${stage.emotion}`
}

/**
 * Get all stages in order
 */
export function getAllStages(): BadgeStageInfo[] {
  return [
    BADGE_STAGES.beginner,
    BADGE_STAGES.forming,
    BADGE_STAGES.growth,
    BADGE_STAGES.mastery,
    BADGE_STAGES.transcendence,
  ]
}
