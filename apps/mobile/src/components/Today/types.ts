/**
 * Common types for Today screen components
 */

import type { ActionType } from '@mandaact/shared'
import type { ActionWithContext } from '../../hooks/useActions'

export type { ActionWithContext }

export interface DateNavigationProps {
    selectedDate: Date
    isToday: boolean
    timezone: string
    onPreviousDay: () => void
    onNextDay: () => void
    onToday: () => void
    onDateSelect: (date: Date) => void
}

export interface ProgressCardProps {
    checkedCount: number
    totalCount: number
    progressPercentage: number
    activeFilters: Set<ActionType>
    typeFilterCollapsed: boolean
    onToggleTypeFilter: () => void
    onToggleFilter: (type: ActionType) => void
    onClearAllFilters: () => void
}

export interface TypeFilterSectionProps {
    activeFilters: Set<ActionType>
    onToggleFilter: (type: ActionType) => void
    onClearAllFilters: () => void
}

export interface MandalartSectionProps {
    mandalartId: string
    mandalartTitle: string
    actions: ActionWithContext[]
    isCollapsed: boolean
    onToggleSection: () => void
    onToggleCheck: (action: ActionWithContext) => void
    onTypeBadgePress: (action: ActionWithContext) => void
    canCheck: boolean
    checkingActions: Set<string>
    isTablet: boolean
}

export interface ActionItemProps {
    action: ActionWithContext
    onToggleCheck: (action: ActionWithContext) => void
    onTypeBadgePress: (action: ActionWithContext) => void
    canCheck: boolean
    isChecking: boolean
    isTablet: boolean
}
