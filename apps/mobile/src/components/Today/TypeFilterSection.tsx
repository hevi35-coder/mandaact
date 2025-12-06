/**
 * TypeFilterSection Component
 *
 * Filter buttons for action types (all, routine, mission, reference)
 * Single-select toggle: pressing same type toggles back to All
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RotateCw, Target, Lightbulb, Info } from 'lucide-react-native'
import type { ActionType } from '@mandaact/shared'
import type { TypeFilterSectionProps } from './types'

export function TypeFilterSection({
    activeFilters,
    onToggleFilter,
    onClearAllFilters,
}: TypeFilterSectionProps) {
    const { t } = useTranslation()

    // Single-select toggle: pressing active type clears all (goes to All)
    const handleTypePress = (type: ActionType) => {
        if (activeFilters.has(type) && activeFilters.size === 1) {
            // If this type is the only active one, clear all (go back to All)
            onClearAllFilters()
        } else {
            // Otherwise, set only this type as active
            onClearAllFilters()
            onToggleFilter(type)
        }
    }

    // Check if only one specific type is selected
    const isSingleTypeActive = (type: ActionType) =>
        activeFilters.has(type) && activeFilters.size === 1

    return (
        <View className="mt-3">
            {/* Filter Buttons - 2 rows x 2 columns for better layout */}
            <View className="gap-2">
                {/* First row: All + Routine */}
                <View className="flex-row gap-2">
                    {/* 전체 버튼 */}
                    <Pressable
                        onPress={onClearAllFilters}
                        className={`flex-1 py-2.5 px-3 rounded-lg border items-center justify-center ${activeFilters.size === 0
                                ? 'bg-gray-900 border-gray-900'
                                : 'bg-white border-gray-300'
                            }`}
                    >
                        <Text
                            className={`text-sm ${activeFilters.size === 0 ? 'text-white' : 'text-gray-700'}`}
                            style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                            {t('common.all')}
                        </Text>
                    </Pressable>

                    {/* 루틴 버튼 */}
                    <Pressable
                        onPress={() => handleTypePress('routine')}
                        className={`flex-1 py-2.5 px-3 rounded-lg border flex-row items-center justify-center ${isSingleTypeActive('routine')
                                ? 'bg-gray-900 border-gray-900'
                                : 'bg-white border-gray-300'
                            }`}
                    >
                        <RotateCw
                            size={14}
                            color={isSingleTypeActive('routine') ? '#ffffff' : '#3b82f6'}
                        />
                        <Text
                            className={`text-sm ml-1.5 ${isSingleTypeActive('routine') ? 'text-white' : 'text-gray-700'}`}
                            style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                            {t('actionType.routine')}
                        </Text>
                    </Pressable>
                </View>

                {/* Second row: Mission + Reference */}
                <View className="flex-row gap-2">
                    {/* 미션 버튼 */}
                    <Pressable
                        onPress={() => handleTypePress('mission')}
                        className={`flex-1 py-2.5 px-3 rounded-lg border flex-row items-center justify-center ${isSingleTypeActive('mission')
                                ? 'bg-gray-900 border-gray-900'
                                : 'bg-white border-gray-300'
                            }`}
                    >
                        <Target
                            size={14}
                            color={isSingleTypeActive('mission') ? '#ffffff' : '#10b981'}
                        />
                        <Text
                            className={`text-sm ml-1.5 ${isSingleTypeActive('mission') ? 'text-white' : 'text-gray-700'}`}
                            style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                            {t('actionType.mission')}
                        </Text>
                    </Pressable>

                    {/* 참고 버튼 */}
                    <Pressable
                        onPress={() => handleTypePress('reference')}
                        className={`flex-1 py-2.5 px-3 rounded-lg border flex-row items-center justify-center ${isSingleTypeActive('reference')
                                ? 'bg-gray-900 border-gray-900'
                                : 'bg-white border-gray-300'
                            }`}
                    >
                        <Lightbulb
                            size={14}
                            color={isSingleTypeActive('reference') ? '#ffffff' : '#f59e0b'}
                        />
                        <Text
                            className={`text-sm ml-1.5 ${isSingleTypeActive('reference') ? 'text-white' : 'text-gray-700'}`}
                            style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                            {t('actionType.reference')}
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Info Text */}
            <View className="flex-row items-center mt-3">
                <Info size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400 ml-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                    {t('today.referenceNote')}
                </Text>
            </View>
        </View>
    )
}
