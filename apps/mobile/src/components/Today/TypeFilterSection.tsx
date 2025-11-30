/**
 * TypeFilterSection Component
 * 
 * Filter buttons for action types (all, routine, mission, reference)
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RotateCw, Target, Lightbulb, Info } from 'lucide-react-native'
import type { TypeFilterSectionProps } from './types'

export function TypeFilterSection({
    activeFilters,
    onToggleFilter,
    onClearAllFilters,
}: TypeFilterSectionProps) {
    const { t } = useTranslation()

    return (
        <View className="mt-3">
            {/* Filter Buttons - 4 columns like Web */}
            <View className="flex-row flex-wrap gap-2">
                {/* 전체 버튼 */}
                <Pressable
                    onPress={onClearAllFilters}
                    className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border ${activeFilters.size === 0
                            ? 'bg-gray-900 border-gray-900'
                            : 'bg-white border-gray-300'
                        }`}
                >
                    <Text
                        className={`text-sm text-center font-medium ${activeFilters.size === 0 ? 'text-white' : 'text-gray-700'
                            }`}
                    >
                        {t('common.all')}
                    </Text>
                </Pressable>

                {/* 루틴 버튼 */}
                <Pressable
                    onPress={() => onToggleFilter('routine')}
                    className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border flex-row items-center justify-center ${activeFilters.has('routine')
                            ? 'bg-gray-900 border-gray-900'
                            : 'bg-white border-gray-300'
                        }`}
                >
                    <RotateCw
                        size={14}
                        color={activeFilters.has('routine') ? '#ffffff' : '#3b82f6'}
                    />
                    <Text
                        className={`text-sm ml-1 font-medium ${activeFilters.has('routine') ? 'text-white' : 'text-gray-700'
                            }`}
                    >
                        {t('actionType.routine')}
                    </Text>
                </Pressable>

                {/* 미션 버튼 */}
                <Pressable
                    onPress={() => onToggleFilter('mission')}
                    className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border flex-row items-center justify-center ${activeFilters.has('mission')
                            ? 'bg-gray-900 border-gray-900'
                            : 'bg-white border-gray-300'
                        }`}
                >
                    <Target
                        size={14}
                        color={activeFilters.has('mission') ? '#ffffff' : '#10b981'}
                    />
                    <Text
                        className={`text-sm ml-1 font-medium ${activeFilters.has('mission') ? 'text-white' : 'text-gray-700'
                            }`}
                    >
                        {t('actionType.mission')}
                    </Text>
                </Pressable>

                {/* 참고 버튼 */}
                <Pressable
                    onPress={() => onToggleFilter('reference')}
                    className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border flex-row items-center justify-center ${activeFilters.has('reference')
                            ? 'bg-gray-900 border-gray-900'
                            : 'bg-white border-gray-300'
                        }`}
                >
                    <Lightbulb
                        size={14}
                        color={activeFilters.has('reference') ? '#ffffff' : '#f59e0b'}
                    />
                    <Text
                        className={`text-sm ml-1 font-medium ${activeFilters.has('reference') ? 'text-white' : 'text-gray-700'
                            }`}
                    >
                        {t('actionType.reference')}
                    </Text>
                </Pressable>
            </View>

            {/* Info Text */}
            <View className="flex-row items-center mt-3">
                <Info size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400 ml-1">
                    {t('today.referenceNote')}
                </Text>
            </View>
        </View>
    )
}
