import React from 'react'
import { View } from 'react-native'
import { MandalartCreationGuide } from './MandalartCreationGuide'
import { MandalartUsageGuide } from './MandalartUsageGuide'

interface TabletGuidanceProps {
    width: number
}

export function TabletGuidance({ width }: TabletGuidanceProps) {
    return (
        <View
            className="flex-row mt-8 gap-4"
            style={{ width }}
        >
            {/* Left: Creation Guide */}
            <MandalartCreationGuide style={{ flex: 1 }} />

            {/* Right: Usage Guide */}
            <MandalartUsageGuide style={{ flex: 1 }} />
        </View>
    )
}

