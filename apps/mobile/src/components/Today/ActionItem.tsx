/**
 * ActionItem Component
 * 
 * Individual action item with checkbox, title, and type badge
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ActionTypeIcon } from './ActionTypeIcon'
import { formatTypeDetailsLocalized } from './utils'
import type { ActionItemProps } from './types'

export const ActionItem = React.memo(({
    action,
    onToggleCheck,
    onTypeBadgePress,
    canCheck,
    isChecking,
    isTablet,
}: ActionItemProps) => {
    const { t } = useTranslation()

    // Check if action can be checked (not reference AND date is today/yesterday)
    const isCheckDisabled = action.type === 'reference' || !canCheck

    return (
        <Animated.View
            entering={FadeInUp.duration(300)}
            className={`flex-row items-center p-4 bg-white rounded-xl border ${action.is_checked
                    ? 'border-gray-200 bg-gray-50'
                    : action.type === 'reference' || !canCheck
                        ? 'border-gray-100 bg-gray-50/50'
                        : 'border-gray-200'
                }`}
        >
            {/* Checkbox - 사각형 스타일 (Web과 동일) */}
            <Pressable
                onPress={() => onToggleCheck(action)}
                disabled={isCheckDisabled || isChecking}
                className="mr-3"
            >
                {isChecking ? (
                    <ActivityIndicator size="small" color="#374151" />
                ) : action.is_checked ? (
                    <View className="w-5 h-5 bg-gray-900 rounded border border-gray-900 items-center justify-center">
                        <Check size={14} color="#ffffff" strokeWidth={3} />
                    </View>
                ) : (
                    <View
                        className={`w-5 h-5 rounded border-2 ${isCheckDisabled
                                ? 'border-gray-300 bg-gray-100'
                                : 'border-gray-400'
                            }`}
                    />
                )}
            </Pressable>

            {/* Content */}
            <View className="flex-1">
                <Text
                    className={`text-base ${action.is_checked
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}
                >
                    {action.title}
                </Text>
                <View className="flex-row items-center mt-1">
                    <Text className="text-xs text-gray-400">
                        {action.sub_goal.title}
                    </Text>
                </View>
            </View>

            {/* Period Progress Badge */}
            {action.period_progress && action.period_progress.target !== null && (
                <View
                    className={`px-2 py-1 rounded-lg mr-2 ${action.period_progress.isCompleted
                            ? 'bg-green-100 border border-green-200'
                            : 'bg-gray-100 border border-gray-200'
                        }`}
                >
                    <Text
                        className={`text-xs ${action.period_progress.isCompleted
                                ? 'text-green-700'
                                : 'text-gray-600'
                            }`}
                    >
                        {t(`actionType.periodLabel.${action.period_progress.periodLabel}`, {
                            defaultValue: action.period_progress.periodLabel
                        })}{' '}
                        {action.period_progress.checkCount}/{action.period_progress.target}
                        {action.period_progress.isCompleted && ' ✓'}
                    </Text>
                </View>
            )}

            {/* Type Badge - Pressable로 변경 (타입 수정 모달 열기) */}
            <Pressable
                onPress={() => onTypeBadgePress(action)}
                className="flex-row items-center bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 active:bg-gray-200"
            >
                <ActionTypeIcon type={action.type} size={14} />
                <Text className="text-xs text-gray-600 ml-1">
                    {formatTypeDetailsLocalized(action, t) ||
                        t(`actionType.${action.type}`)}
                </Text>
            </Pressable>
        </Animated.View>
    )
})

ActionItem.displayName = 'ActionItem'
