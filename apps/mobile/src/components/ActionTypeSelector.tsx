import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native'
import {
  X,
  Check,
  RotateCw,
  Target,
  Lightbulb,
  Info,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import {
  type ActionType,
  type RoutineFrequency,
  type MissionCompletionType,
  type MissionPeriodCycle,
  suggestActionType,
  getInitialPeriod,
} from '@mandaact/shared'
import { logger } from '../lib/logger'

export interface ActionTypeData {
  type: ActionType
  routine_frequency?: RoutineFrequency
  routine_weekdays?: number[]
  routine_count_per_period?: number
  mission_completion_type?: MissionCompletionType
  mission_period_cycle?: MissionPeriodCycle
  mission_current_period_start?: string
  mission_current_period_end?: string
  ai_suggestion?: {
    type: string
    confidence: string
    reason: string
  }
}

interface ActionTypeSelectorProps {
  visible: boolean
  actionId: string
  actionTitle: string
  initialData?: ActionTypeData
  onClose: () => void
  onSave: (data: ActionTypeData) => Promise<void>
}

// Helper to get type icon
function getTypeIcon(type: ActionType) {
  switch (type) {
    case 'routine':
      return <RotateCw size={20} color="#3b82f6" />
    case 'mission':
      return <Target size={20} color="#10b981" />
    case 'reference':
      return <Lightbulb size={20} color="#f59e0b" />
  }
}

const WEEKLY_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const MONTHLY_COUNT_OPTIONS = [1, 2, 3, 5, 10, 20, 30]

export default function ActionTypeSelector({
  visible,
  actionId: _actionId,
  actionTitle,
  initialData,
  onClose,
  onSave,
}: ActionTypeSelectorProps) {
  const { t } = useTranslation()

  // Translated options - must be inside component to use t()
  const typeOptions = [
    {
      type: 'routine' as ActionType,
      label: t('actionType.routine'),
      description: t('actionType.selector.routineDesc'),
      icon: getTypeIcon('routine'),
    },
    {
      type: 'mission' as ActionType,
      label: t('actionType.mission'),
      description: t('actionType.selector.missionDesc'),
      icon: getTypeIcon('mission'),
    },
    {
      type: 'reference' as ActionType,
      label: t('actionType.reference'),
      description: t('actionType.selector.referenceDesc'),
      icon: getTypeIcon('reference'),
    },
  ]

  const frequencyOptions = [
    { value: 'daily' as RoutineFrequency, label: t('actionType.daily') },
    { value: 'weekly' as RoutineFrequency, label: t('actionType.weekly') },
    { value: 'monthly' as RoutineFrequency, label: t('actionType.monthly') },
  ]

  const missionCompletionOptions = [
    { value: 'once' as MissionCompletionType, label: t('actionType.selector.onceDesc') },
    { value: 'periodic' as MissionCompletionType, label: t('actionType.selector.periodicDesc') },
  ]

  const periodCycleOptions = [
    { value: 'daily' as MissionPeriodCycle, label: t('actionType.daily') },
    { value: 'weekly' as MissionPeriodCycle, label: t('actionType.weekly') },
    { value: 'monthly' as MissionPeriodCycle, label: t('actionType.monthly') },
    { value: 'quarterly' as MissionPeriodCycle, label: t('actionType.quarterly') },
    { value: 'yearly' as MissionPeriodCycle, label: t('actionType.yearly') },
  ]

  const [type, setType] = useState<ActionType>(initialData?.type || 'routine')
  const [routineFrequency, setRoutineFrequency] = useState<RoutineFrequency>(
    initialData?.routine_frequency || 'daily'
  )
  const [routineWeekdays, setRoutineWeekdays] = useState<number[]>(
    initialData?.routine_weekdays || []
  )
  const [routineCountPerPeriod, setRoutineCountPerPeriod] = useState<number>(
    initialData?.routine_count_per_period || 1
  )
  const [missionCompletionType, setMissionCompletionType] = useState<MissionCompletionType>(
    initialData?.mission_completion_type || 'once'
  )
  const [missionPeriodCycle, setMissionPeriodCycle] = useState<MissionPeriodCycle>(
    initialData?.mission_period_cycle || 'monthly'
  )
  const [aiSuggestion, setAiSuggestion] = useState(initialData?.ai_suggestion)
  const [saving, setSaving] = useState(false)

  // Monthly custom input
  const [showMonthlyCustomInput, setShowMonthlyCustomInput] = useState(false)
  const [monthlyCustomValue, setMonthlyCustomValue] = useState('')

  // Translated weekday names
  const weekdays = useMemo(() => [
    { value: 1, label: t('actionType.weekdayShort.mon'), short: t('actionType.weekdayShort.mon') },
    { value: 2, label: t('actionType.weekdayShort.tue'), short: t('actionType.weekdayShort.tue') },
    { value: 3, label: t('actionType.weekdayShort.wed'), short: t('actionType.weekdayShort.wed') },
    { value: 4, label: t('actionType.weekdayShort.thu'), short: t('actionType.weekdayShort.thu') },
    { value: 5, label: t('actionType.weekdayShort.fri'), short: t('actionType.weekdayShort.fri') },
    { value: 6, label: t('actionType.weekdayShort.sat'), short: t('actionType.weekdayShort.sat') },
    { value: 0, label: t('actionType.weekdayShort.sun'), short: t('actionType.weekdayShort.sun') },
  ], [t])

  // Initialize from AI suggestion
  useEffect(() => {
    if (!visible || !actionTitle) return

    // Reset states when editing existing action
    if (initialData) {
      setType(initialData.type)
      setRoutineFrequency(initialData.routine_frequency || 'daily')
      setRoutineWeekdays(initialData.routine_weekdays || [])
      setRoutineCountPerPeriod(initialData.routine_count_per_period || 1)
      setMissionCompletionType(initialData.mission_completion_type || 'once')
      setMissionPeriodCycle(initialData.mission_period_cycle || 'monthly')
    }

    // Generate AI suggestion
    const freshSuggestion = suggestActionType(actionTitle)
    setAiSuggestion({
      type: freshSuggestion.type,
      confidence: freshSuggestion.confidence,
      reason: freshSuggestion.reason,
    })

    // Only auto-apply for new actions
    if (!initialData) {
      setType(freshSuggestion.type)
    }
  }, [visible, actionTitle, initialData])

  const handleWeekdayToggle = (day: number) => {
    setRoutineWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSave = useCallback(async () => {
    setSaving(true)

    try {
      // Build data with explicit null values to clear unused fields
      const data: ActionTypeData = {
        type,
        ai_suggestion: aiSuggestion,
        // Clear all type-specific fields by default
        routine_frequency: undefined,
        routine_weekdays: undefined,
        routine_count_per_period: undefined,
        mission_completion_type: undefined,
        mission_period_cycle: undefined,
        mission_current_period_start: undefined,
        mission_current_period_end: undefined,
      }

      if (type === 'routine') {
        data.routine_frequency = routineFrequency

        if (routineFrequency === 'weekly') {
          if (routineWeekdays.length > 0) {
            // Weekday-based: set weekdays, clear count
            data.routine_weekdays = routineWeekdays
            data.routine_count_per_period = undefined
          } else {
            // Count-based: set count, clear weekdays
            data.routine_count_per_period = routineCountPerPeriod || 1
            data.routine_weekdays = []  // Empty array to clear
          }
        } else if (routineFrequency === 'monthly') {
          data.routine_count_per_period = routineCountPerPeriod || 1
          data.routine_weekdays = []  // Clear weekdays
        } else if (routineFrequency === 'daily') {
          // Daily: clear both weekdays and count
          data.routine_weekdays = []
          data.routine_count_per_period = undefined
        }
      } else if (type === 'mission') {
        data.mission_completion_type = missionCompletionType

        if (missionCompletionType === 'periodic') {
          data.mission_period_cycle = missionPeriodCycle
          const { start, end } = getInitialPeriod(missionPeriodCycle)
          data.mission_current_period_start = start.toISOString()
          data.mission_current_period_end = end.toISOString()
        }
      }

      await onSave(data)
      onClose()
    } catch (error) {
      logger.error('Error saving action type', error)
      throw error  // Re-throw to propagate to caller
    } finally {
      setSaving(false)
    }
  }, [
    type,
    aiSuggestion,
    routineFrequency,
    routineWeekdays,
    routineCountPerPeriod,
    missionCompletionType,
    missionPeriodCycle,
    onSave,
    onClose,
  ])

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return t('actionType.selector.confidenceHigh')
      case 'medium':
        return t('actionType.selector.confidenceMedium')
      default:
        return t('actionType.selector.confidenceLow')
    }
  }

  // Get translated reason based on suggestion type
  const getTranslatedReason = (type: string) => {
    switch (type) {
      case 'routine':
        return t('actionType.selector.reasonRoutine')
      case 'mission':
        return t('actionType.selector.reasonMission')
      case 'reference':
        return t('actionType.selector.reasonReference')
      default:
        return t('actionType.selector.reasonRoutine')
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
              <Pressable onPress={onClose} className="p-2">
                <X size={24} color="#6b7280" />
              </Pressable>
              <Text className="text-lg font-semibold text-gray-900">
                {t('actionType.selector.title')}
              </Text>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                className="p-2"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : (
                  <Check size={24} color="#374151" />
                )}
              </Pressable>
            </View>

            <ScrollView className="px-4 py-4">
              {/* Action Title */}
              <Text className="text-sm text-gray-500 mb-4">
                {t('actionType.selector.description', { title: actionTitle })}
              </Text>

              {/* AI Suggestion */}
              {aiSuggestion && (
                <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                  <Text className="text-sm font-medium text-blue-900">
                    {t('actionType.selector.aiSuggestion')}: {t(`actionType.${aiSuggestion.type}`)}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Info size={12} color="#1e40af" />
                    <Text className="text-xs text-blue-700 ml-1 flex-1">
                      {getTranslatedReason(aiSuggestion.type)} ({t('actionType.selector.confidence')}: {getConfidenceLabel(aiSuggestion.confidence)})
                    </Text>
                  </View>
                </View>
              )}

              {/* Type Selection */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('actionType.selector.typeLabel')}
                </Text>
                <View className="gap-2">
                  {typeOptions.map((option) => (
                    <Pressable
                      key={option.type}
                      onPress={() => setType(option.type)}
                      className={`flex-row items-center p-3 rounded-xl border ${
                        type === option.type
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <View
                        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                          type === option.type
                            ? 'border-gray-900 bg-gray-900'
                            : 'border-gray-300'
                        }`}
                      >
                        {type === option.type && (
                          <View className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </View>
                      <View className="mr-2">{option.icon}</View>
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-gray-900">
                          {t(`actionType.${option.type}`)}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {t(`actionType.selector.${option.type}Desc`)}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Routine Settings */}
              {type === 'routine' && (
                <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                  <Text className="text-base font-semibold text-gray-900 mb-3">
                    {t('actionType.selector.routineSettings')}
                  </Text>

                  {/* Frequency Select - Button Style */}
                  <View className="mb-3">
                    <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.repeatCycle')}</Text>
                    <View className="flex-row" style={{ gap: 8 }}>
                      {frequencyOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            setRoutineFrequency(option.value)
                            // Reset count to appropriate default when frequency changes
                            setRoutineCountPerPeriod(1)
                            setRoutineWeekdays([])
                            setShowMonthlyCustomInput(false)
                            setMonthlyCustomValue('')
                          }}
                          className={`flex-1 py-2.5 rounded-lg border items-center ${
                            routineFrequency === option.value
                              ? 'bg-gray-900 border-gray-900'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              routineFrequency === option.value
                                ? 'text-white'
                                : 'text-gray-700'
                            }`}
                          >
                            {t(`actionType.${option.value}`)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Weekly Weekdays Selection */}
                  {routineFrequency === 'weekly' && (
                    <View className="mb-3">
                      <Text className="text-sm text-gray-700 mb-2">
                        {t('actionType.selector.weekdaySelect')}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {weekdays.map((day) => (
                          <Pressable
                            key={day.value}
                            onPress={() => handleWeekdayToggle(day.value)}
                            className={`w-9 h-9 rounded-lg items-center justify-center border ${
                              routineWeekdays.includes(day.value)
                                ? 'bg-gray-900 border-gray-900'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            <Text
                              className={`text-sm font-medium ${
                                routineWeekdays.includes(day.value)
                                  ? 'text-white'
                                  : 'text-gray-700'
                              }`}
                            >
                              {day.short}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <View className="flex-row items-center mt-2">
                        <Info size={12} color="#9ca3af" />
                        <Text className="text-xs text-gray-400 ml-1">
                          {t('actionType.selector.weekdayHint')}
                        </Text>
                      </View>

                      {/* Weekly Count (when no weekdays selected) */}
                      {routineWeekdays.length === 0 && (
                        <View className="mt-3">
                          <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.weeklyGoal')}</Text>
                          <View className="flex-row" style={{ gap: 8 }}>
                            {WEEKLY_COUNT_OPTIONS.map((count) => (
                              <Pressable
                                key={count}
                                onPress={() => setRoutineCountPerPeriod(count)}
                                className={`w-9 h-9 rounded-lg items-center justify-center border ${
                                  routineCountPerPeriod === count
                                    ? 'bg-gray-900 border-gray-900'
                                    : 'bg-white border-gray-300'
                                }`}
                              >
                                <Text
                                  className={`text-sm font-medium ${
                                    routineCountPerPeriod === count
                                      ? 'text-white'
                                      : 'text-gray-700'
                                  }`}
                                >
                                  {count}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Monthly Count */}
                  {routineFrequency === 'monthly' && (
                    <View className="mb-3">
                      <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.monthlyGoal')}</Text>
                      <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
                        {MONTHLY_COUNT_OPTIONS.map((count) => (
                          <Pressable
                            key={count}
                            onPress={() => {
                              setRoutineCountPerPeriod(count)
                              setShowMonthlyCustomInput(false)
                            }}
                            className={`w-9 h-9 rounded-lg items-center justify-center border ${
                              routineCountPerPeriod === count && !showMonthlyCustomInput
                                ? 'bg-gray-900 border-gray-900'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            <Text
                              className={`text-sm font-medium ${
                                routineCountPerPeriod === count && !showMonthlyCustomInput
                                  ? 'text-white'
                                  : 'text-gray-700'
                              }`}
                            >
                              {count}
                            </Text>
                          </Pressable>
                        ))}
                        {/* Custom Input - inline */}
                        {showMonthlyCustomInput ? (
                          <View className="flex-row items-center" style={{ gap: 4 }}>
                            <TextInput
                              value={monthlyCustomValue}
                              onChangeText={(text) => {
                                const num = text.replace(/[^0-9]/g, '')
                                const limitedNum = num ? Math.min(parseInt(num), 31) : 0
                                setMonthlyCustomValue(limitedNum > 0 ? String(limitedNum) : '')
                                if (limitedNum > 0) {
                                  setRoutineCountPerPeriod(limitedNum)
                                }
                              }}
                              placeholder="?"
                              keyboardType="number-pad"
                              maxLength={2}
                              className="w-9 h-9 border border-gray-900 bg-gray-900 rounded-lg text-sm text-center text-white"
                              placeholderTextColor="#9ca3af"
                              autoFocus
                            />
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => {
                              setShowMonthlyCustomInput(true)
                              setMonthlyCustomValue(
                                !MONTHLY_COUNT_OPTIONS.includes(routineCountPerPeriod)
                                  ? String(routineCountPerPeriod)
                                  : ''
                              )
                            }}
                            className="w-9 h-9 rounded-lg items-center justify-center border border-dashed border-gray-400"
                          >
                            <Text className="text-sm font-medium text-gray-500">+</Text>
                          </Pressable>
                        )}
                      </View>
                      <View className="flex-row items-center mt-2">
                        <Info size={12} color="#9ca3af" />
                        <Text className="text-xs text-gray-400 ml-1">
                          {t('actionType.selector.dailyHint')}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Mission Settings */}
              {type === 'mission' && (
                <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                  <Text className="text-base font-semibold text-gray-900 mb-3">
                    {t('actionType.selector.missionSettings')}
                  </Text>

                  {/* Completion Type */}
                  <View className="mb-3">
                    <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.completionType')}</Text>
                    <View className="gap-2">
                      {missionCompletionOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => setMissionCompletionType(option.value)}
                          className={`flex-row items-center p-3 rounded-lg border ${
                            missionCompletionType === option.value
                              ? 'border-gray-900 bg-white'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <View
                            className={`w-4 h-4 rounded-full border-2 mr-3 items-center justify-center ${
                              missionCompletionType === option.value
                                ? 'border-gray-900'
                                : 'border-gray-300'
                            }`}
                          >
                            {missionCompletionType === option.value && (
                              <View className="w-2 h-2 rounded-full bg-gray-900" />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-900">
                              {t(`actionType.${option.value}`)}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-0.5">
                              {t(`actionType.selector.${option.value}Desc`)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Period Cycle (for periodic missions) - Button Style */}
                  {missionCompletionType === 'periodic' && (
                    <View className="mt-3">
                      <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.periodCycle')}</Text>
                      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                        {periodCycleOptions.map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => setMissionPeriodCycle(option.value)}
                            className={`px-4 py-2 rounded-lg border ${
                              missionPeriodCycle === option.value
                                ? 'bg-gray-900 border-gray-900'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            <Text
                              className={`text-sm font-medium ${
                                missionPeriodCycle === option.value
                                  ? 'text-white'
                                  : 'text-gray-700'
                              }`}
                            >
                              {t(`actionType.${option.value}`)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Reference Info */}
              {type === 'reference' && (
                <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                  <View className="flex-row items-center">
                    <Info size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-500 ml-2">
                      {t('actionType.selector.referenceInfo')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Bottom spacing */}
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
