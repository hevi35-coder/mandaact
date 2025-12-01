/**
 * BadgeMiniCard Component
 * 
 * Mini badge card for collection grid
 */

import React from 'react'
import { Text, Pressable } from 'react-native'
import type { BadgeMiniCardProps } from './types'

export function BadgeMiniCard({
    badge,
    isUnlocked,
    isSecret,
    onPress,
    translateBadge,
}: BadgeMiniCardProps) {
    const translatedBadge = translateBadge(badge)

    return (
        <Pressable
            className={`flex-1 p-3 rounded-xl items-center justify-center min-h-[90px] ${isUnlocked
                    ? 'bg-amber-50 border-2 border-amber-200'
                    : 'bg-gray-100 border border-gray-200 opacity-50'
                }`}
            onPress={onPress}
        >
            <Text className={`text-2xl mb-1 ${isUnlocked ? '' : 'opacity-30'}`}>
                {translatedBadge.icon}
            </Text>
            <Text
                className={`text-xs font-medium text-center ${isUnlocked ? 'text-gray-900' : 'text-gray-400'
                    }`}
                numberOfLines={1}
            >
                {isSecret && !isUnlocked ? '???' : translatedBadge.name}
            </Text>
        </Pressable>
    )
}
