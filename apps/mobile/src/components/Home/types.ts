/**
 * Home screen component types
 */

import type { XPMultiplier } from '@mandaact/shared'
import type { BadgeDefinition, UserBadge, BadgeProgress } from '../../hooks/useBadges'

// Re-export for convenience
export type { XPMultiplier, BadgeDefinition, UserBadge, BadgeProgress }

export interface ProfileCardProps {
    currentLevel: number
    nickname: string
    totalXP: number
    xpProgress: number
    xpRequired: number
    xpPercentage: number
    totalChecks: number
    activeDays: number
    isLoading: boolean
    onEditNickname: () => void
    // Children components props
    activeMultipliers: XPMultiplier[]
    badges: BadgeDefinition[]
    userBadges: UserBadge[]
    badgeProgress: BadgeProgress[]
    badgesLoading: boolean
    translateBadge: (badge: BadgeDefinition) => BadgeDefinition
    onBadgePress: (badge: BadgeDefinition) => void
}

export interface XPInfoSectionProps {
    activeMultipliers: XPMultiplier[]
}

export interface BadgeCollectionSectionProps {
    badges: BadgeDefinition[]
    userBadges: UserBadge[]
    badgeProgress: BadgeProgress[]
    isLoading: boolean
    translateBadge: (badge: BadgeDefinition) => BadgeDefinition
    onBadgePress: (badge: BadgeDefinition) => void
}

export interface StreakCardProps {
    currentStreak: number
    longestStreak: number
    lastCheckDate?: string | Date | null
    longestStreakDate?: string | Date | null
    isNewRecord: boolean
    fourWeekData: Array<{
        date: string
        percentage: number
    }>
    fourWeekLoading: boolean
}

export interface FourWeekHeatmapProps {
    fourWeekData: Array<{
        date: string
        percentage: number
    }>
    isLoading: boolean
}

export interface NicknameModalProps {
    visible: boolean
    currentNickname: string
    onClose: () => void
}

export interface BadgeMiniCardProps {
    badge: BadgeDefinition
    isUnlocked: boolean
    isSecret: boolean
    onPress: (badge: BadgeDefinition) => void
    translateBadge: (badge: BadgeDefinition) => BadgeDefinition
}
