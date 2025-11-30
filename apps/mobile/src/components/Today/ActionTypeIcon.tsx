/**
 * ActionTypeIcon Component
 * 
 * Displays action type icon with consistent colors across web and mobile
 */

import React from 'react'
import { RotateCw, Target, Lightbulb } from 'lucide-react-native'
import type { ActionType } from '@mandaact/shared'

interface ActionTypeIconProps {
    type: ActionType
    size?: number
}

export function ActionTypeIcon({ type, size = 16 }: ActionTypeIconProps) {
    switch (type) {
        case 'routine':
            return <RotateCw size={size} color="#3b82f6" />  // Blue (web)
        case 'mission':
            return <Target size={size} color="#10b981" />    // Green (web)
        case 'reference':
            return <Lightbulb size={size} color="#f59e0b" /> // Amber (web)
        default:
            return null
    }
}
