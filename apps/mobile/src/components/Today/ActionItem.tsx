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
// YesterdayCheckButton DISABLED - rewarded ad feature removed per AdMob policy review
// import { YesterdayCheckButton } from '../ads'
import type { ActionItemProps } from './types'

export const ActionItem = React.memo(({
    action,
    onToggleCheck,
    onTypeBadgePress,
    canCheck,
    isChecking,
    isTablet,
    isUnconfigured,
    // YesterdayCheckButton props DISABLED - rewarded ad feature removed
    // showYesterdayButton,
    // onYesterdayCheckCompleted,
}: ActionItemProps) => {
    const { t } = useTranslation()

    // Check if action can be checked (not reference AND date is today/yesterday)
    // Unconfigured items are allowed to be checked if not reference, per user request "Rest enable"
    const isCheckDisabled = action.type === 'reference' || !canCheck

    // Common Content: Title and SubGoal
    const renderContent = () => (
        <View className="flex-1 justify-center mr-2">
            <Text
                className={`text-base ${action.is_checked
                    ? 'text-gray-500 line-through'
                    : 'text-gray-900'
                    }`}
                numberOfLines={1}
            >
                {action.title}
            </Text>
            <Text
                className="text-xs text-gray-400 mt-0.5"
                numberOfLines={1}
            >
                {action.sub_goal.title}
            </Text>
        </View>
    )

    // Common Badges: Type and Progress
    const renderBadges = () => {
        if (isUnconfigured) {
            return (
                <Pressable
                    onPress={() => onTypeBadgePress(action)}
                    className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-200"
                >
                    <ActionTypeIcon type={action.type} size={14} />
                    <Text className="text-xs text-amber-600 ml-1">
                        {t('actionType.unconfigured')}
                    </Text>
                </Pressable>
            )
        }

        return (
            <View className="flex-col items-center gap-1">
                {/* Type Badge */}
                <Pressable
                    onPress={() => onTypeBadgePress(action)}
                    className="flex-row items-center bg-gray-100 px-2 py-1.5 rounded-lg border border-gray-200 active:bg-gray-200"
                >
                    <ActionTypeIcon type={action.type} size={14} />
                    <Text className="text-xs text-gray-600 ml-1 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>
                        {formatTypeDetailsLocalized(action, t) ||
                            t(`actionType.${action.type}`)}
                    </Text>
                </Pressable>

                {/* Period Progress Text */}
                {!isTablet && action.period_progress && action.period_progress.target !== null && (!action.routine_weekdays || action.routine_weekdays.length === 0) && (
                    <Text
                        className={`text-[11px] ${action.period_progress.isCompleted
                            ? 'text-green-600 font-bold'
                            : 'text-gray-400 font-medium'
                            }`}
                        style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                        {t(`actionType.periodLabel.${action.period_progress.periodLabel}`, {
                            defaultValue: action.period_progress.periodLabel
                        })}{' '}
                        {action.period_progress.checkCount}/{action.period_progress.target}
                        {action.period_progress.isCompleted && ' ✓'}
                    </Text>
                )}
            </View>
        )
    }

    // iPad Tablet Layout (Optional: Can be same as mobile if unified)
    // Checking Tablet specific logic in original code:
    // Original Tablet: Title -> SubGoal (stacked) - Badges on Right.
    // Original Mobile: Title + SubGoal (Inline) -> Badges (Bottom).
    // Unified Request: Title -> SubGoal (stacked) -> Badges on Right.
    // This matches original Tablet layout mostly, but applies to mobile too.

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
            {/* Checkbox */}
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

            {/* Content (Title/SubGoal) */}
            {renderContent()}

            {/* Badges (Right side) */}
            {renderBadges()}

            {/* Tablet-specific extra badges if any? */}
            {isTablet && !isUnconfigured && action.period_progress && action.period_progress.target !== null && (!action.routine_weekdays || action.routine_weekdays.length === 0) && (
                <View
                    className={`ml-1.5 px-2 py-1 rounded-lg ${action.period_progress.isCompleted
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

        </Animated.View>
    )
})

ActionItem.displayName = 'ActionItem'
