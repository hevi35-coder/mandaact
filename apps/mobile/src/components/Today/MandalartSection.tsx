/**
 * MandalartSection Component
 * 
 * Displays a collapsible section for a mandalart with its actions
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ActionItem } from './ActionItem'
import type { MandalartSectionProps } from './types'

export const MandalartSection = React.memo(({
    mandalartId,
    mandalartTitle,
    actions,
    isCollapsed,
    onToggleSection,
    onToggleCheck,
    onTypeBadgePress,
    canCheck,
    checkingActions,
    isTablet,
}: MandalartSectionProps) => {
    const { t } = useTranslation()

    // Calculate progress (exclude reference actions)
    const mandalartNonRef = actions.filter((a) => a.type !== 'reference')
    const mandalartChecked = mandalartNonRef.filter((a) => a.is_checked).length
    const mandalartTotal = mandalartNonRef.length

    // Get core goal from first action's mandalart
    const coreGoal = actions[0]?.sub_goal?.mandalart?.center_goal || ''

    return (
        <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="mb-4"
        >
            {/* Section Header */}
            <Pressable
                onPress={onToggleSection}
                className="flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
                <View className="flex-1">
                    <View className="flex-row items-center">
                        <Text className="text-base font-semibold text-gray-900">
                            {mandalartTitle}
                        </Text>
                        <Text className="text-sm text-gray-500 ml-2">
                            {mandalartChecked}/{mandalartTotal}
                        </Text>
                    </View>
                    <Text
                        className="text-sm text-gray-500 mt-1"
                        numberOfLines={1}
                    >
                        {t('today.coreGoal')}: {coreGoal}
                    </Text>
                </View>
                {isCollapsed ? (
                    <ChevronRight size={20} color="#6b7280" />
                ) : (
                    <ChevronDown size={20} color="#6b7280" />
                )}
            </Pressable>

            {/* Actions in this Mandalart */}
            {!isCollapsed && (
                <View className="mt-2 space-y-2">
                    {actions.map((action) => (
                        <ActionItem
                            key={action.id}
                            action={action}
                            onToggleCheck={onToggleCheck}
                            onTypeBadgePress={onTypeBadgePress}
                            canCheck={canCheck}
                            isChecking={checkingActions.has(action.id)}
                            isTablet={isTablet}
                        />
                    ))}
                </View>
            )}
        </Animated.View>
    )
})

MandalartSection.displayName = 'MandalartSection'
