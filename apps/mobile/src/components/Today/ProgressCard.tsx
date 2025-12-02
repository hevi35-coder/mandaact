/**
 * ProgressCard Component
 * 
 * Displays daily progress with type filter toggle
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Info } from 'lucide-react-native'
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

            {/* Info Text */}
            <View className="flex-row items-center mt-3">
                <Info size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400 ml-1">
                    {t('today.dateRestriction')}
                </Text>
            </View>

            {/* Type Filter - Collapsible Section */}
            <View className="border-t border-gray-100 mt-4 pt-4">
                <Pressable
                    onPress={onToggleTypeFilter}
                    className="flex-row items-center justify-between"
                >
                    <Text className="text-sm font-medium text-gray-900">
                        {t('today.typeFilter')}
                    </Text>
                    {typeFilterCollapsed ? (
                        <ChevronRight size={16} color="#6b7280" />
                    ) : (
                        <ChevronDown size={16} color="#6b7280" />
                    )}
                </Pressable>

                {!typeFilterCollapsed && (
                    <TypeFilterSection
                        activeFilters={activeFilters}
                        onToggleFilter={onToggleFilter}
                        onClearAllFilters={onClearAllFilters}
                    />
                )}
            </View>
        </Animated.View>
    )
}
