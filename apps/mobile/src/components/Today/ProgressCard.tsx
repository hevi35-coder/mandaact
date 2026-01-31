/**
 * ProgressCard Component
 * 
 * Displays daily progress with type filter toggle
 */

import React from 'react'
import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { TypeFilterSection } from './TypeFilterSection'
import type { ProgressCardProps } from './types'

export function ProgressCard({
    checkedCount,
    totalCount,
    progressPercentage,
    activeFilters,
    typeFilterCollapsed,
    onToggleTypeFilter,
    onToggleFilter,
    onClearAllFilters,
}: ProgressCardProps) {
    const { t } = useTranslation()

    return (
        <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-6 mb-5 border border-gray-100"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
            }}
        >
            {/* Progress Header */}
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                    <Text className="text-base font-semibold text-gray-900">
                        {t('today.achievementRate')}
                    </Text>
                    <Text className="text-lg font-bold text-gray-900 ml-3">
                        {progressPercentage}%
                    </Text>
                </View>
                <Text className="text-sm text-gray-500">
                    {checkedCount} / {totalCount}
                </Text>
            </View>

            {/* Progress Bar */}
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <Animated.View
                    entering={FadeInUp.delay(300).duration(300)}
                    className="h-full rounded-full overflow-hidden"
                    style={{ width: `${progressPercentage}%` }}
                >
                    <LinearGradient
                        colors={['#2563eb', '#9333ea', '#db2777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                    />
                </Animated.View>
            </View>



            {/* Active Type Filter (Horizontal Chips) */}
            <TypeFilterSection
                activeFilters={activeFilters}
                onToggleFilter={onToggleFilter}
                onClearAllFilters={onClearAllFilters}
            />
        </Animated.View>
    )
}
