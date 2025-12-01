/**
 * Mandalart Create Screen Types
 */

import type { SubGoal, Action } from '@mandaact/shared'

// Local MandalartData type for creation flow
export interface MandalartData {
    title: string
    center_goal: string
    sub_goals: Array<{
        position: number
        title: string
        actions: Array<{
            position: number
            title: string
        }>
    }>
}

export type InputMethod = 'image' | 'text' | 'manual' | null
export type Step = 'select-method' | 'input' | 'preview'

export interface CreateState {
    step: Step
    method: InputMethod
    isLoading: boolean
    progressMessage: string
    mandalartData: MandalartData | null
}

// Props for MethodSelector
export interface MethodSelectorProps {
    onSelectMethod: (method: InputMethod) => void
}

// Props for Input Steps
export interface InputStepProps {
    onBack: () => void
    onNext: (data: MandalartData) => void
    setLoading: (loading: boolean, message?: string) => void
}

// Props for Preview Step
export interface PreviewStepProps {
    data: MandalartData
    onBack: () => void
    onSave: () => Promise<void>
    onUpdateData: (data: MandalartData) => void
    isSaving: boolean
}

// Props for Grid Components
export interface MandalartGridProps {
    data: MandalartData
    onCenterGoalPress: () => void
    onSubGoalPress: (subGoal: SubGoal) => void
    onActionPress: (subGoal: SubGoal, action: Action) => void
}

// Props for Progress Overlay
export interface ProgressOverlayProps {
    visible: boolean
    message: string
}
