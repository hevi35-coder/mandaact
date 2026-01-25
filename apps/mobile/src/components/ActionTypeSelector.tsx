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
  Sparkles,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import {
  type ActionType,
  type RoutineFrequency,
  type MissionCompletionType,
  type MissionPeriodCycle,
  suggestActionType,
  suggestActionTypeV2,
  getInitialPeriod,
} from '@mandaact/shared'
import { logger } from '../lib/logger'
import { trackActionTypeSuggested } from '../lib'
import ActionTypeSettingsView from './ActionTypeSettingsView'

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
      Icon: RotateCw,
    },
    {
      type: 'mission' as ActionType,
      label: t('actionType.mission'),
      description: t('actionType.selector.missionDesc'),
      Icon: Target,
    },
    {
      type: 'reference' as ActionType,
      label: t('actionType.reference'),
      description: t('actionType.selector.referenceDesc'),
      Icon: Lightbulb,
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

      // Keep existing AI suggestion if available, otherwise null
      setAiSuggestion(initialData.ai_suggestion)
    } else {
      // Default for new actions without suggestion
      setAiSuggestion(undefined)
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

  const getTranslatedReason = (suggestion: { type: string; reason?: string }) => {
    const maybeKey = suggestion.reason
    if (typeof maybeKey === 'string' && maybeKey.startsWith('actionType.')) {
      return t(maybeKey)
    }

    switch (suggestion.type) {
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
                className="bg-violet-500 px-4 py-2 rounded-full"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-[14px] font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                    {t('common.save', 'Save')}
                  </Text>
                )}
              </Pressable>
            </View>

            <ScrollView className="px-4 py-4">
              {/* Type Selection & Settings (Shared Component) */}
              <ActionTypeSettingsView
                type={type}
                actionTitle={actionTitle}
                routineFrequency={routineFrequency}
                routineWeekdays={routineWeekdays}
                routineCountPerPeriod={routineCountPerPeriod}
                missionType={missionCompletionType}
                missionCycle={missionPeriodCycle}
                showMonthlyCustomInput={showMonthlyCustomInput}
                monthlyCustomValue={monthlyCustomValue}
                aiSuggestion={aiSuggestion ? { type: aiSuggestion.type } : null}
                onTypeChange={setType}
                onRoutineFrequencyChange={(freq) => {
                  setRoutineFrequency(freq)
                  setRoutineCountPerPeriod(1)
                  setRoutineWeekdays([])
                  setShowMonthlyCustomInput(false)
                  setMonthlyCustomValue('')
                }}
                onWeekdayToggle={handleWeekdayToggle}
                onRoutineCountChange={setRoutineCountPerPeriod}
                onMissionTypeChange={setMissionCompletionType}
                onMissionCycleChange={setMissionPeriodCycle}
                onShowMonthlyCustomInputChange={setShowMonthlyCustomInput}
                onMonthlyCustomValueChange={setMonthlyCustomValue}
              />

              {/* Bottom spacing */}
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal >
  )
}
