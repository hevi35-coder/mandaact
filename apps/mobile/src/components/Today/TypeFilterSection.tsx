import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
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
            onClearAllFilters()
        } else {
            onClearAllFilters()
            onToggleFilter(type)
        }
    }

    const isSingleTypeActive = (type: ActionType) =>
        activeFilters.has(type) && activeFilters.size === 1

    const Chip = ({
        label,
        isActive,
        onPress,
        icon: Icon
    }: {
        label: string
        isActive: boolean
        onPress: () => void
        icon?: React.ElementType
    }) => (
        <Pressable
            onPress={onPress}
            className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${isActive
                ? 'bg-gray-900 border-gray-900'
                : 'bg-white border-gray-200'
                }`}
        >
            {Icon && (
                <Icon
                    size={14}
                    color={isActive ? '#ffffff' : '#3b82f6'} // Default blue for icons if not generic, specific types below
                    style={{ marginRight: 6 }}
                />
            )}
            <Text
                className={`text-sm ${isActive ? 'text-white' : 'text-gray-600'}`}
                style={{ fontFamily: 'Pretendard-Medium' }}
            >
                {label}
            </Text>
        </Pressable>
    )

    return (
        <View className="mt-4">
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
            >
                {/* All */}
                <Chip
                    label={t('common.all')}
                    isActive={activeFilters.size === 0}
                    onPress={onClearAllFilters}
                />

                {/* Routine */}
                <Pressable
                    onPress={() => handleTypePress('routine')}
                    className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${isSingleTypeActive('routine')
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <RotateCw
                        size={14}
                        color={isSingleTypeActive('routine') ? '#ffffff' : '#3b82f6'}
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        className={`text-sm ${isSingleTypeActive('routine') ? 'text-white' : 'text-gray-600'}`}
                        style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                        {t('actionType.routine')}
                    </Text>
                </Pressable>

                {/* Mission */}
                <Pressable
                    onPress={() => handleTypePress('mission')}
                    className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${isSingleTypeActive('mission')
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <Target
                        size={14}
                        color={isSingleTypeActive('mission') ? '#ffffff' : '#10b981'}
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        className={`text-sm ${isSingleTypeActive('mission') ? 'text-white' : 'text-gray-600'}`}
                        style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                        {t('actionType.mission')}
                    </Text>
                </Pressable>

                {/* Reference */}
                <Pressable
                    onPress={() => handleTypePress('reference')}
                    className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${isSingleTypeActive('reference')
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <Lightbulb
                        size={14}
                        color={isSingleTypeActive('reference') ? '#ffffff' : '#f59e0b'}
                        style={{ marginRight: 6 }}
                    />
                    <Text
                        className={`text-sm ${isSingleTypeActive('reference') ? 'text-white' : 'text-gray-600'}`}
                        style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                        {t('actionType.reference')}
                    </Text>
                </Pressable>
            </ScrollView>

            {/* Info Text Stack */}
            <View className="mt-3 pl-1 gap-1">
                {/* Date Restriction Note */}
                <View className="flex-row items-center">
                    <Info size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-400 ml-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                        {t('today.dateRestriction')}
                    </Text>
                </View>

                {/* Reference Type Note */}
                <View className="flex-row items-center">
                    <Info size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-400 ml-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                        {t('today.referenceNote')}
                    </Text>
                </View>
            </View>
        </View>
    )
}
