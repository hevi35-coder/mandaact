/**
 * Common types for MandalartList components
 */

import type { Mandalart } from '@mandaact/shared'

export type { Mandalart }

export interface MandalartCardProps {
    mandalart: Mandalart
    isToggling: boolean
    onPress: (mandalart: Mandalart) => void
    onToggleActive: (mandalart: Mandalart) => void
}

export interface CreateButtonProps {
    onPress: () => void
}

export interface EmptyStateProps {
    onCreateNew: () => void
    onShowTutorial: () => void
}
