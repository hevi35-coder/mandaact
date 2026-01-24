/**
 * ActionTypeSettingsView
 * 
 * A compact, reusable component for action type selection and configuration.
 * Uses horizontal tabs for type selection and progressive disclosure for settings.
 */
import React, { useMemo } from 'react'
import {
    View,
    Text,
    Pressable,
    TextInput,
    ScrollView,
} from 'react-native'
import {
    RotateCw,
    Target,
    Lightbulb,
    Info,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import type {
    ActionType,
    RoutineFrequency,
    MissionCompletionType,
    MissionPeriodCycle,
} from '@mandaact/shared'

// Constants
const MONTHLY_COUNT_OPTIONS = [1, 2, 3, 5, 10, 20, 30]

// Type for AI suggestion
export interface ActionTypeSuggestion {
    type: string
    confidence?: string
    reason?: string
}

// Props interface
export interface ActionTypeSettingsViewProps {
    // Current values
    type: ActionType
    routineFrequency: RoutineFrequency
    routineWeekdays: number[]
    routineCountPerPeriod: number
    missionType: MissionCompletionType
    missionCycle: MissionPeriodCycle

    // Monthly custom input state
    showMonthlyCustomInput: boolean
    monthlyCustomValue: string

    // AI Suggestion (optional)
    aiSuggestion?: ActionTypeSuggestion | null

    // Callbacks
    onTypeChange: (type: ActionType) => void
    onRoutineFrequencyChange: (frequency: RoutineFrequency) => void
    onWeekdayToggle: (day: number) => void
    onRoutineCountChange: (count: number) => void
    onMissionTypeChange: (type: MissionCompletionType) => void
    onMissionCycleChange: (cycle: MissionPeriodCycle) => void
    onShowMonthlyCustomInputChange: (show: boolean) => void
    onMonthlyCustomValueChange: (value: string) => void

    // Action Title to display at the top
    actionTitle?: string
}

export function ActionTypeSettingsView({
    type,
    routineFrequency,
    routineWeekdays,
    routineCountPerPeriod,
    missionType,
    missionCycle,
    showMonthlyCustomInput,
    monthlyCustomValue,
    aiSuggestion,
    onTypeChange,
    onRoutineFrequencyChange,
    onWeekdayToggle,
    onRoutineCountChange,
    onMissionTypeChange,
    onMissionCycleChange,
    onShowMonthlyCustomInputChange,
    onMonthlyCustomValueChange,
    actionTitle,
}: ActionTypeSettingsViewProps) {
    const { t } = useTranslation()

    // Type options with icons
    const typeOptions = useMemo(() => [
        { type: 'routine' as ActionType, Icon: RotateCw, label: t('actionType.routine') },
        { type: 'mission' as ActionType, Icon: Target, label: t('actionType.mission') },
        { type: 'reference' as ActionType, Icon: Lightbulb, label: t('actionType.reference') },
    ], [t])

    // Frequency options
    const frequencyOptions = useMemo(() => [
        { value: 'daily' as RoutineFrequency, label: t('actionType.daily') },
        { value: 'weekly' as RoutineFrequency, label: t('actionType.weekly') },
        { value: 'monthly' as RoutineFrequency, label: t('actionType.monthly') },
    ], [t])

    // Period cycle options
    const periodCycleOptions = useMemo(() => [
        { value: 'daily' as MissionPeriodCycle, label: t('actionType.daily') },
        { value: 'weekly' as MissionPeriodCycle, label: t('actionType.weekly') },
        { value: 'monthly' as MissionPeriodCycle, label: t('actionType.monthly') },
        { value: 'quarterly' as MissionPeriodCycle, label: t('actionType.quarterly') },
        { value: 'yearly' as MissionPeriodCycle, label: t('actionType.yearly') },
    ], [t])

    // Weekdays - order based on locale (Sun first for English, Mon first for others)
    const { i18n } = useTranslation()
    const isEnglish = i18n.language?.startsWith('en')

    const weekdays = useMemo(() => {
        const days = [
            { value: 1, short: t('actionType.weekdayShort.mon') },
            { value: 2, short: t('actionType.weekdayShort.tue') },
            { value: 3, short: t('actionType.weekdayShort.wed') },
            { value: 4, short: t('actionType.weekdayShort.thu') },
            { value: 5, short: t('actionType.weekdayShort.fri') },
            { value: 6, short: t('actionType.weekdayShort.sat') },
            { value: 0, short: t('actionType.weekdayShort.sun') },
        ]
        // For English: Sunday first
        if (isEnglish) {
            const sunday = days.pop()!
            days.unshift(sunday)
        }
        return days
    }, [t, isEnglish])

    // Minimum height for settings area to prevent jumping
    const SETTINGS_MIN_HEIGHT = 180

    return (
        <View>
            {/* Action Title (if provided) */}
            {actionTitle && (
                <View className="mb-4">
                    <Text className="text-gray-500 text-[14px]" style={{ fontFamily: 'Pretendard-Medium' }} numberOfLines={1}>
                        {t('actionType.selector.actionLabel', 'Action')}: <Text className="text-gray-800 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>{actionTitle}</Text>
                    </Text>
                </View>
            )}

            {/* Type Label */}
            <Text className="text-gray-900 text-[13px] mb-2" style={{ fontFamily: 'Pretendard-Medium' }}>
                {t('actionType.selector.typeLabel', 'Type')}
            </Text>

            {/* Type Selection - Horizontal Tabs (icons for Korean, text-only for English) */}
            <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
                {typeOptions.map((option) => {
                    const isSelected = type === option.type
                    const Icon = option.Icon
                    const isAiSuggested = aiSuggestion?.type === option.type

                    return (
                        <Pressable
                            key={option.type}
                            onPress={() => onTypeChange(option.type)}
                            className={`flex-1 flex-row items-center justify-center py-2.5 px-1 rounded-lg ${isSelected ? 'bg-white' : ''}`}
                        >
                            {/* Show icon only for non-English locales */}
                            {!isEnglish && (
                                <Icon
                                    size={14}
                                    color={isSelected ? '#2563eb' : '#6b7280'}
                                />
                            )}
                            <Text
                                className={`text-[13px] font-bold ${!isEnglish ? 'ml-1' : ''} ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}
                                style={{ fontFamily: 'Pretendard-Bold' }}
                            >
                                {option.label}
                            </Text>
                            {isAiSuggested && (
                                <View className="bg-purple-100 px-1 py-0.5 rounded ml-0.5">
                                    <Text className="text-[9px] text-purple-600 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                                        {t('mandalart.modal.subGoal.aiSuggest.suggested', 'Suggested')}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    )
                })}
            </View>

            {/* Settings Area with minimum height */}
            <View style={{ minHeight: SETTINGS_MIN_HEIGHT }}>
                {/* Type Description */}
                <View className="bg-gray-50 rounded-xl px-3 py-2 mb-4 flex-row items-center">
                    <Info size={14} color="#6b7280" />
                    <Text className="text-[12px] text-gray-600 ml-2 flex-1" style={{ fontFamily: 'Pretendard-Medium' }}>
                        {t(`actionType.selector.${type}Desc`)}
                    </Text>
                </View>

                {/* Routine Settings - Compact */}
                {type === 'routine' && (
                    <View>
                        {/* Frequency Selection */}
                        <View className="mb-4">
                            <Text className="text-[13px] font-bold text-gray-700 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
                                {t('actionType.selector.repeatCycle')}
                            </Text>
                            <View className="flex-row">
                                {frequencyOptions.map((option, idx) => (
                                    <Pressable
                                        key={option.value}
                                        onPress={() => {
                                            onRoutineFrequencyChange(option.value)
                                            onRoutineCountChange(1)
                                        }}
                                        className={`flex-1 py-2.5 rounded-lg items-center ${idx < frequencyOptions.length - 1 ? 'mr-2' : ''} ${routineFrequency === option.value ? 'bg-gray-900' : 'bg-gray-100'}`}
                                    >
                                        <Text className={`text-[14px] font-bold ${routineFrequency === option.value ? 'text-white' : 'text-gray-600'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                                            {option.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Weekly Weekday Selection */}
                        {routineFrequency === 'weekly' && (
                            <View className="mb-4">
                                <Text className="text-[13px] font-bold text-gray-700 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
                                    {t('actionType.selector.weekdaySelectCompact', '요일 선택')}
                                </Text>
                                <View className="flex-row">
                                    {weekdays.map((day, idx) => (
                                        <Pressable
                                            key={day.value}
                                            onPress={() => onWeekdayToggle(day.value)}
                                            className={`w-[40px] h-[40px] rounded-lg items-center justify-center ${idx < weekdays.length - 1 ? 'mr-1.5' : ''} ${routineWeekdays.includes(day.value) ? 'bg-gray-900' : 'bg-gray-100'}`}
                                        >
                                            <Text className={`text-[13px] font-bold ${routineWeekdays.includes(day.value) ? 'text-white' : 'text-gray-600'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                                                {day.short}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Monthly Count */}
                        {routineFrequency === 'monthly' && (
                            <View className="mb-4">
                                <Text className="text-[13px] font-bold text-gray-700 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
                                    {t('actionType.selector.monthlyGoal')}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row">
                                        {MONTHLY_COUNT_OPTIONS.map((count, idx) => (
                                            <Pressable
                                                key={count}
                                                onPress={() => {
                                                    onRoutineCountChange(count)
                                                    onShowMonthlyCustomInputChange(false)
                                                }}
                                                className={`w-[40px] h-[40px] rounded-lg items-center justify-center mr-2 ${routineCountPerPeriod === count && !showMonthlyCustomInput ? 'bg-gray-900' : 'bg-gray-100'}`}
                                            >
                                                <Text className={`text-[14px] font-bold ${routineCountPerPeriod === count && !showMonthlyCustomInput ? 'text-white' : 'text-gray-600'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                                                    {count}
                                                </Text>
                                            </Pressable>
                                        ))}
                                        {showMonthlyCustomInput ? (
                                            <TextInput
                                                value={monthlyCustomValue}
                                                onChangeText={(text) => {
                                                    const num = text.replace(/[^0-9]/g, '')
                                                    const limitedNum = num ? Math.min(parseInt(num), 31) : 0
                                                    onMonthlyCustomValueChange(limitedNum > 0 ? String(limitedNum) : '')
                                                    if (limitedNum > 0) {
                                                        onRoutineCountChange(limitedNum)
                                                    }
                                                }}
                                                placeholder="?"
                                                keyboardType="number-pad"
                                                maxLength={2}
                                                className="w-[40px] h-[40px] bg-gray-900 rounded-lg text-[14px] font-bold text-center text-white"
                                                placeholderTextColor="#9ca3af"
                                                autoFocus
                                                style={{ fontFamily: 'Pretendard-Bold' }}
                                            />
                                        ) : (
                                            <Pressable
                                                onPress={() => {
                                                    onShowMonthlyCustomInputChange(true)
                                                    onMonthlyCustomValueChange(!MONTHLY_COUNT_OPTIONS.includes(routineCountPerPeriod) ? String(routineCountPerPeriod) : '')
                                                }}
                                                className="w-[40px] h-[40px] rounded-lg items-center justify-center border border-dashed border-gray-300 bg-white"
                                            >
                                                <Text className="text-[16px] font-bold text-gray-400">+</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                )}

                {/* Mission Settings - Compact */}
                {type === 'mission' && (
                    <View>
                        {/* Completion Type - Horizontal Layout (matching routine style) */}
                        <View className="mb-4">
                            <Text className="text-[13px] font-bold text-gray-700 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
                                {t('actionType.selector.completionType')}
                            </Text>
                            <View className="flex-row">
                                <Pressable
                                    onPress={() => onMissionTypeChange('once')}
                                    className={`flex-1 py-2.5 rounded-lg items-center mr-2 ${missionType === 'once' ? 'bg-gray-900' : 'bg-gray-100'}`}
                                >
                                    <Text className={`text-[14px] font-bold ${missionType === 'once' ? 'text-white' : 'text-gray-600'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                                        {t('actionType.selector.onceDesc')}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => onMissionTypeChange('periodic')}
                                    className={`flex-1 py-2.5 rounded-lg items-center ${missionType === 'periodic' ? 'bg-gray-900' : 'bg-gray-100'}`}
                                >
                                    <Text className={`text-[14px] font-bold ${missionType === 'periodic' ? 'text-white' : 'text-gray-600'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                                        {t('actionType.selector.periodicDesc')}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Period Cycle (for periodic missions) */}
                        {missionType === 'periodic' && (
                            <View className="mb-4">
                                <Text className="text-[13px] font-bold text-gray-700 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
                                    {t('actionType.selector.periodCycle')}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row">
                                        {periodCycleOptions.map((option, idx) => (
                                            <Pressable
                                                key={option.value}
                                                onPress={() => onMissionCycleChange(option.value)}
                                                className={`px-4 py-2.5 rounded-lg mr-2 ${missionCycle === option.value ? 'bg-gray-900' : 'bg-gray-100'}`}
                                            >
                                                <Text className={`text-[14px] font-bold ${missionCycle === option.value ? 'text-white' : 'text-gray-600'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                                                    {option.label}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                )}

                {/* Reference Info - Minimal */}
                {type === 'reference' && (
                    <View className="bg-gray-50 rounded-lg px-3 py-2 flex-row items-center">
                        <Info size={14} color="#6b7280" />
                        <Text className="text-[12px] text-gray-600 ml-2 flex-1" style={{ fontFamily: 'Pretendard-Medium' }}>
                            {t('actionType.selector.referenceInfo')}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    )
}

// Default export for convenience
export default ActionTypeSettingsView
