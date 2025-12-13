import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  X,
  Check,
  Pencil,
  Trash2,
  GripVertical,
  RotateCw,
  Target,
  Lightbulb,
  ChevronLeft,
  Info,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import SortableList from './SortableList'
import {
  suggestActionType,
  type ActionType,
  type RoutineFrequency,
  type MissionCompletionType,
  type MissionPeriodCycle,
} from '@mandaact/shared'
import type { TFunction } from 'i18next'

interface ActionData {
  position: number
  title: string
  type?: ActionType
  routine_frequency?: RoutineFrequency
  routine_weekdays?: number[]
  routine_count_per_period?: number
  mission_completion_type?: MissionCompletionType
  mission_period_cycle?: MissionPeriodCycle
}

interface SubGoalData {
  position: number
  title: string
  actions: ActionData[]
}

interface SubGoalModalProps {
  visible: boolean
  onClose: () => void
  position: number
  initialTitle: string
  initialActions: Array<{ position: number; title: string; type?: ActionType }>
  onSave: (data: SubGoalData) => void
}

const WEEKLY_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const MONTHLY_COUNT_OPTIONS = [1, 2, 3, 5, 10, 20, 30]

// Action type icon component
function ActionTypeIcon({ type, size = 12 }: { type: ActionType; size?: number }) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#3b82f6" />
    case 'mission':
      return <Target size={size} color="#10b981" />
    case 'reference':
      return <Lightbulb size={size} color="#f59e0b" />
    default:
      return <RotateCw size={size} color="#3b82f6" />
  }
}

function getTranslatedTypeDetails(action: ActionData, t: TFunction): string {
  if (!action.type) return t('mandalart.modal.subGoal.notSet')

  if (action.type === 'routine') {
    if (!action.routine_frequency) return t('mandalart.modal.subGoal.notSet')
    if (action.routine_frequency === 'daily') return t('actionType.daily')

    if (action.routine_frequency === 'weekly') {
      if (action.routine_weekdays && action.routine_weekdays.length > 0) {
        const sortedWeekdays = [...action.routine_weekdays].sort((a, b) => {
          const aVal = a === 0 ? 7 : a
          const bVal = b === 0 ? 7 : b
          return aVal - bVal
        })

        const isWeekdays =
          sortedWeekdays.length === 5 && sortedWeekdays.every((day, idx) => day === idx + 1)
        const isWeekend = sortedWeekdays.length === 2 && sortedWeekdays[0] === 6 && sortedWeekdays[1] === 0

        if (isWeekdays) return t('actionType.format.weekday')
        if (isWeekend) return t('actionType.format.weekend')

        const dayMap: Record<number, string> = {
          0: t('actionType.weekdayShort.sun'),
          1: t('actionType.weekdayShort.mon'),
          2: t('actionType.weekdayShort.tue'),
          3: t('actionType.weekdayShort.wed'),
          4: t('actionType.weekdayShort.thu'),
          5: t('actionType.weekdayShort.fri'),
          6: t('actionType.weekdayShort.sat'),
        }
        return sortedWeekdays.map((d) => dayMap[d] ?? '').filter(Boolean).join(', ')
      }

      if (action.routine_count_per_period) {
        return t('actionType.format.timesPerWeek', { count: action.routine_count_per_period })
      }
      return t('actionType.weekly')
    }

    if (action.routine_frequency === 'monthly') {
      if (action.routine_count_per_period) {
        return t('actionType.format.timesPerMonth', { count: action.routine_count_per_period })
      }
      return t('actionType.monthly')
    }

    return t('mandalart.modal.subGoal.notSet')
  }

  if (action.type === 'mission') {
    if (!action.mission_completion_type) return t('mandalart.modal.subGoal.notSet')
    if (action.mission_completion_type === 'once') return t('actionType.once')
    if (action.mission_completion_type === 'periodic') return t(`actionType.${action.mission_period_cycle || 'monthly'}`)
    return t('mandalart.modal.subGoal.notSet')
  }

  if (action.type === 'reference') return t('actionType.reference')

  return t('mandalart.modal.subGoal.notSet')
}

function getTypeLabel(action: ActionData, t: TFunction): string {
  if (!action.type) return t('mandalart.modal.subGoal.notSet')
  return getTranslatedTypeDetails(action, t)
}

export default function SubGoalModal({
  visible,
  onClose,
  position,
  initialTitle,
  initialActions,
  onSave,
}: SubGoalModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [actions, setActions] = useState<ActionData[]>([])
  const [editingTitleMode, setEditingTitleMode] = useState(false)
  const [editingActionId, setEditingActionId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')

  // Type selector state
  const [viewMode, setViewMode] = useState<'list' | 'typeSelector'>('list')
  const [selectedActionIndex, setSelectedActionIndex] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState<ActionType>('routine')
  const [routineFrequency, setRoutineFrequency] = useState<RoutineFrequency>('daily')
  const [routineWeekdays, setRoutineWeekdays] = useState<number[]>([])
  const [routineCountPerPeriod, setRoutineCountPerPeriod] = useState<number>(1)
  const [missionCompletionType, setMissionCompletionType] = useState<MissionCompletionType>('once')
  const [missionPeriodCycle, setMissionPeriodCycle] = useState<MissionPeriodCycle>('monthly')

  // Custom monthly input states
  const [showCustomMonthlyInput, setShowCustomMonthlyInput] = useState(false)
  const [customMonthlyValue, setCustomMonthlyValue] = useState('')

  const weekdays = useMemo(() => ([
    { value: 1, short: t('actionType.weekdayShort.mon') },
    { value: 2, short: t('actionType.weekdayShort.tue') },
    { value: 3, short: t('actionType.weekdayShort.wed') },
    { value: 4, short: t('actionType.weekdayShort.thu') },
    { value: 5, short: t('actionType.weekdayShort.fri') },
    { value: 6, short: t('actionType.weekdayShort.sat') },
    { value: 0, short: t('actionType.weekdayShort.sun') },
  ]), [t])

  // Translated options
  const typeOptions = useMemo(() => [
    {
      type: 'routine' as ActionType,
      label: t('actionType.routine'),
      description: t('actionType.selector.routineDesc'),
      color: '#3b82f6',
    },
    {
      type: 'mission' as ActionType,
      label: t('actionType.mission'),
      description: t('actionType.selector.missionDesc'),
      color: '#10b981',
    },
    {
      type: 'reference' as ActionType,
      label: t('actionType.reference'),
      description: t('actionType.selector.referenceDesc'),
      color: '#f59e0b',
    },
  ], [t])

  const frequencyOptions = useMemo(() => [
    { value: 'daily' as RoutineFrequency, label: t('actionType.daily') },
    { value: 'weekly' as RoutineFrequency, label: t('actionType.weekly') },
    { value: 'monthly' as RoutineFrequency, label: t('actionType.monthly') },
  ], [t])

  const missionCompletionOptions = useMemo(() => ([
    { value: 'once' as MissionCompletionType, title: t('actionType.once'), description: t('actionType.selector.onceDesc') },
    { value: 'periodic' as MissionCompletionType, title: t('actionType.periodic'), description: t('actionType.selector.periodicDesc') },
  ]), [t])

  const periodCycleOptions = useMemo(() => [
    { value: 'daily' as MissionPeriodCycle, label: t('actionType.daily') },
    { value: 'weekly' as MissionPeriodCycle, label: t('actionType.weekly') },
    { value: 'monthly' as MissionPeriodCycle, label: t('actionType.monthly') },
    { value: 'quarterly' as MissionPeriodCycle, label: t('actionType.quarterly') },
    { value: 'yearly' as MissionPeriodCycle, label: t('actionType.yearly') },
  ], [t])

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle)
      // Ensure 8 actions
      const filledActions: ActionData[] = Array.from({ length: 8 }, (_, i) => {
        const existing = initialActions.find((a) => a.position === i + 1)
        if (existing) {
          // Apply AI suggestion for type if not set
          const suggestion = existing.type ? null : suggestActionType(existing.title)
          const isHighConfidence = suggestion?.confidence === 'high'

          return {
            position: i + 1,
            title: existing.title,
            type: existing.type || suggestion?.type || 'routine',
            // Only auto-set frequency/completion_type when AI confidence is 'high'
            routine_frequency: isHighConfidence ? suggestion?.routineFrequency : undefined,
            routine_weekdays: isHighConfidence ? suggestion?.routineWeekdays : undefined,
            routine_count_per_period: isHighConfidence ? suggestion?.routineCountPerPeriod : undefined,
            mission_completion_type: isHighConfidence ? suggestion?.missionCompletionType : undefined,
            mission_period_cycle: isHighConfidence ? suggestion?.missionPeriodCycle : undefined,
          }
        }
        return {
          position: i + 1,
          title: '',
          type: 'routine',
        }
      })
      setActions(filledActions)
      setEditingTitleMode(!initialTitle.trim())
      setEditingActionId(null)
      setViewMode('list')
    }
  }, [visible, initialTitle, initialActions])

  const handleClose = useCallback(() => {
    // Auto-save on close
    onSave({
      position,
      title,
      actions,
    })
    onClose()
  }, [position, title, actions, onSave, onClose])

  const handleTitleEdit = useCallback(() => {
    setEditingTitleMode(true)
    setEditingText(title)
    setEditingActionId(null)
  }, [title])

  const handleTitleSave = useCallback(() => {
    setTitle(editingText)
    setEditingTitleMode(false)
  }, [editingText])

  const handleActionEdit = useCallback((index: number) => {
    setEditingActionId(index)
    setEditingText(actions[index].title)
    setEditingTitleMode(false)
  }, [actions])

  const handleActionSave = useCallback((index: number) => {
    const newActions = [...actions]
    const trimmedTitle = editingText.trim()
    newActions[index] = {
      ...newActions[index],
      title: trimmedTitle,
    }

    // Apply AI suggestion if title changed and has content
    // Only auto-set frequency/completion_type when AI confidence is 'high'
    if (trimmedTitle) {
      const suggestion = suggestActionType(trimmedTitle)
      const isHighConfidence = suggestion.confidence === 'high'

      newActions[index].type = suggestion.type
      newActions[index].routine_frequency = isHighConfidence ? suggestion.routineFrequency : undefined
      newActions[index].routine_weekdays = isHighConfidence ? suggestion.routineWeekdays : undefined
      newActions[index].routine_count_per_period = isHighConfidence ? suggestion.routineCountPerPeriod : undefined
      newActions[index].mission_completion_type = isHighConfidence ? suggestion.missionCompletionType : undefined
      newActions[index].mission_period_cycle = isHighConfidence ? suggestion.missionPeriodCycle : undefined
    }

    setActions(newActions)
    setEditingActionId(null)
  }, [editingText, actions])

  const handleActionDelete = useCallback((index: number) => {
    const newActions = [...actions]
    newActions[index] = {
      position: actions[index].position,
      title: '',
      type: 'routine',
    }
    setActions(newActions)
  }, [actions])

  // Open type selector
  const openTypeSelector = useCallback((index: number) => {
    const action = actions[index]
    setSelectedActionIndex(index)
    setSelectedType(action.type || 'routine')
    setRoutineFrequency(action.routine_frequency || 'daily')
    setRoutineWeekdays(action.routine_weekdays || [])
    setRoutineCountPerPeriod(action.routine_count_per_period || 1)
    setMissionCompletionType(action.mission_completion_type || 'once')
    setMissionPeriodCycle(action.mission_period_cycle || 'monthly')
    // Reset custom input states
    setShowCustomMonthlyInput(false)
    setCustomMonthlyValue('')
    setViewMode('typeSelector')
  }, [actions])

  // Save type settings
  const handleTypeSave = useCallback(() => {
    if (selectedActionIndex === null) return

    const newActions = [...actions]
    newActions[selectedActionIndex] = {
      ...newActions[selectedActionIndex],
      type: selectedType,
      routine_frequency: selectedType === 'routine' ? routineFrequency : undefined,
      routine_weekdays: selectedType === 'routine' && routineFrequency === 'weekly' && routineWeekdays.length > 0 ? routineWeekdays : undefined,
      routine_count_per_period: selectedType === 'routine' && routineFrequency !== 'daily' ? routineCountPerPeriod : undefined,
      mission_completion_type: selectedType === 'mission' ? missionCompletionType : undefined,
      mission_period_cycle: selectedType === 'mission' && missionCompletionType === 'periodic' ? missionPeriodCycle : undefined,
    }
    setActions(newActions)
    setViewMode('list')
    setSelectedActionIndex(null)
  }, [selectedActionIndex, actions, selectedType, routineFrequency, routineWeekdays, routineCountPerPeriod, missionCompletionType, missionPeriodCycle])

  const handleWeekdayToggle = useCallback((day: number) => {
    setRoutineWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }, [])

  // Handle drag reorder
  const handleDragEnd = useCallback((reorderedActions: ActionData[]) => {
    // Update positions after reorder
    const updatedActions = reorderedActions.map((a, idx) => ({
      ...a,
      position: idx + 1,
    }))
    setActions(updatedActions)
  }, [])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={handleClose}
        >
          <Pressable
            className="bg-white rounded-t-2xl"
            style={{ maxHeight: '85%' }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {viewMode === 'list' ? (
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <View className="flex-row items-center">
                  <Pressable onPress={handleClose} className="p-1 mr-2">
                    <X size={24} color="#6b7280" />
                  </Pressable>
                  <Text className="text-lg font-semibold text-gray-900">
                    {t('mandalart.modal.subGoal.title', { position })}
                  </Text>
                </View>
                <Pressable
                  onPress={handleClose}
                  className="bg-primary px-4 py-2 rounded-lg flex-row items-center"
                >
                  <Check size={18} color="white" />
                  <Text className="text-white font-semibold ml-1">{t('common.done')}</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Pressable
                  onPress={() => {
                    setViewMode('list')
                    setSelectedActionIndex(null)
                  }}
                  className="p-1"
                >
                  <ChevronLeft size={24} color="#6b7280" />
                </Pressable>
                <Text className="text-lg font-semibold text-gray-900">
                  {t('mandalart.modal.subGoal.typeSettings')}
                </Text>
                <Pressable onPress={handleTypeSave} className="p-1">
                  <Check size={24} color="#374151" />
                </Pressable>
              </View>
            )}

            {viewMode === 'list' ? (
              <ScrollView className="p-4">
                {/* Sub-goal Title */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    {t('mandalart.modal.subGoal.subGoalLabel')}
                  </Text>
                  {editingTitleMode ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <TextInput
                        value={editingText}
                        onChangeText={setEditingText}
                        placeholder={t('mandalart.modal.subGoal.subGoalPlaceholder')}
                        className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-base"
                        autoFocus
                        onSubmitEditing={handleTitleSave}
                      />
                      <Pressable onPress={handleTitleSave} className="p-2">
                        <Check size={20} color="#10b981" />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEditingTitleMode(false)
                          setEditingText('')
                        }}
                        className="p-2"
                      >
                        <X size={20} color="#6b7280" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleTitleEdit}
                      className="flex-row items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <Text className={`flex-1 text-base ${title ? 'text-gray-900' : 'text-gray-400'}`}>
                        {title || t('mandalart.modal.subGoal.subGoalPlaceholder')}
                      </Text>
                      <Pencil size={16} color="#9ca3af" />
                    </Pressable>
                  )}
                </View>

                {/* Actions List with Drag Reorder */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    {t('mandalart.modal.subGoal.actionsLabel')}
                  </Text>
                  <GestureHandlerRootView>
                    <SortableList
                      data={actions}
                      keyExtractor={(action) => String(action.position)}
                      itemHeight={52}
                      onDragEnd={handleDragEnd}
                      renderItem={({ item: action, index }) => (
                        <View className="flex-row items-center bg-white border border-gray-200 rounded-lg p-2 mb-2">
                          {/* Drag Handle + Position */}
                          <View className="flex-row items-center mr-2">
                            <GripVertical size={16} color="#9ca3af" />
                            <Text className="text-sm text-gray-400 ml-1 w-5">
                              {index + 1}.
                            </Text>
                          </View>

                          {/* Action Content */}
                          {editingActionId === index ? (
                            <View className="flex-1 flex-row items-center" style={{ gap: 4 }}>
                              <TextInput
                                value={editingText}
                                onChangeText={setEditingText}
                                placeholder={t('mandalart.modal.subGoal.actionPlaceholder', { index: index + 1 })}
                                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                autoFocus
                                onSubmitEditing={() => handleActionSave(index)}
                              />
                              <Pressable onPress={() => handleActionSave(index)} className="p-1">
                                <Check size={18} color="#10b981" />
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  setEditingActionId(null)
                                  setEditingText('')
                                }}
                                className="p-1"
                              >
                                <X size={18} color="#6b7280" />
                              </Pressable>
                            </View>
                          ) : (
                            <>
                              {/* Title */}
                              <Pressable
                                onPress={() => handleActionEdit(index)}
                                className="flex-1 py-1"
                              >
                                <Text className={`text-sm ${action.title ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {action.title || t('mandalart.modal.subGoal.actionPlaceholder', { index: index + 1 })}
                                </Text>
                              </Pressable>

                              {/* Type Badge - always visible */}
                              <Pressable
                                onPress={() => action.title && openTypeSelector(index)}
                                disabled={!action.title}
                                className={`flex-row items-center px-2 py-1 rounded ml-2 ${
                                  action.title ? 'bg-gray-100 active:bg-gray-200' : 'bg-gray-50'
                                }`}
                              >
                                <ActionTypeIcon type={action.type || 'routine'} size={12} />
                                <Text className={`text-xs ml-1 ${action.title ? 'text-gray-600' : 'text-gray-400'}`}>
                                  {getTypeLabel(action, t)}
                                </Text>
                              </Pressable>

                              {/* Delete button - only for filled actions */}
                              {action.title.trim() && (
                                <Pressable
                                  onPress={() => handleActionDelete(index)}
                                  className="p-1.5 ml-1"
                                >
                                  <Trash2 size={14} color="#ef4444" />
                                </Pressable>
                              )}
                            </>
                          )}
                        </View>
                      )}
                    />
                  </GestureHandlerRootView>
                </View>

                <View className="h-8" />
              </ScrollView>
            ) : (
              /* Type Selector View */
              <ScrollView className="p-4">
                {selectedActionIndex !== null && (
                  <Text className="text-sm text-gray-500 mb-4">
                    {t('mandalart.modal.subGoal.selectType', { title: actions[selectedActionIndex]?.title })}
                  </Text>
                )}

                {/* Type Selection */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    {t('mandalart.modal.subGoal.actionTypeLabel')}
                  </Text>
                  <View style={{ gap: 8 }}>
                    {typeOptions.map((option) => (
                      <Pressable
                        key={option.type}
                        onPress={() => setSelectedType(option.type)}
                        className={`flex-row items-center p-4 rounded-xl border ${
                          selectedType === option.type
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <View
                          className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                            selectedType === option.type
                              ? 'border-gray-900 bg-gray-900'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedType === option.type && (
                            <View className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </View>
                        {option.type === 'routine' && <RotateCw size={20} color={option.color} />}
                        {option.type === 'mission' && <Target size={20} color={option.color} />}
                        {option.type === 'reference' && <Lightbulb size={20} color={option.color} />}
                        <View className="flex-1 ml-2">
                          <Text className="text-sm font-medium text-gray-900">
                            {option.label}
                          </Text>
                          <Text className="text-xs text-gray-500 mt-0.5">
                            {option.description}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Routine Settings */}
                {selectedType === 'routine' && (
                  <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                    <Text className="text-base font-semibold text-gray-900 mb-3">
                      {t('mandalart.modal.routine.title')}
                    </Text>

                    {/* Frequency */}
                    <View className="mb-3">
                      <Text className="text-sm text-gray-700 mb-2">{t('mandalart.modal.routine.repeatCycle')}</Text>
                      <View className="flex-row" style={{ gap: 8 }}>
                        {frequencyOptions.map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => {
                              setRoutineFrequency(option.value)
                              setRoutineCountPerPeriod(1)
                              setRoutineWeekdays([])
                              setShowCustomMonthlyInput(false)
                              setCustomMonthlyValue('')
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
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Weekly Weekdays */}
                    {routineFrequency === 'weekly' && (
                      <View className="mb-3">
                        <Text className="text-sm text-gray-700 mb-2">
                          {t('mandalart.modal.routine.weekdayLabel')}
                        </Text>
                        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
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
                        <Text className="text-xs text-gray-400 mt-2">
                          {t('actionType.selector.weekdayHint')}
                        </Text>

                        {routineWeekdays.length === 0 && (
                          <View className="mt-3">
                            <Text className="text-sm text-gray-700 mb-2">{t('mandalart.modal.routine.weeklyGoal')}</Text>
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
                        <Text className="text-sm text-gray-700 mb-2">{t('mandalart.modal.routine.monthlyGoal')}</Text>
                        <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
                          {MONTHLY_COUNT_OPTIONS.map((count) => (
                            <Pressable
                              key={count}
                              onPress={() => {
                                setRoutineCountPerPeriod(count)
                                setShowCustomMonthlyInput(false)
                              }}
                              className={`w-9 h-9 rounded-lg items-center justify-center border ${
                                routineCountPerPeriod === count && !showCustomMonthlyInput
                                  ? 'bg-gray-900 border-gray-900'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <Text
                                className={`text-sm font-medium ${
                                  routineCountPerPeriod === count && !showCustomMonthlyInput
                                    ? 'text-white'
                                    : 'text-gray-700'
                                }`}
                              >
                                {count}
                              </Text>
                            </Pressable>
                          ))}
                          {/* Custom Input - inline */}
                          {showCustomMonthlyInput ? (
                            <View className="flex-row items-center" style={{ gap: 4 }}>
                              <TextInput
                                value={customMonthlyValue}
                                onChangeText={(text) => {
                                  const num = text.replace(/[^0-9]/g, '')
                                  const limitedNum = num ? Math.min(parseInt(num), 31) : 0
                                  setCustomMonthlyValue(limitedNum > 0 ? String(limitedNum) : '')
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
                                setShowCustomMonthlyInput(true)
                                setCustomMonthlyValue(
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
                            {t('mandalart.modal.routine.dailyHint')}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Mission Settings */}
                {selectedType === 'mission' && (
                  <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                    <Text className="text-base font-semibold text-gray-900 mb-3">
                      {t('mandalart.modal.mission.title')}
                    </Text>

                    <View className="mb-3">
                      <Text className="text-sm text-gray-700 mb-2">{t('mandalart.modal.mission.completionType')}</Text>
                      <View style={{ gap: 8 }}>
                        {missionCompletionOptions.map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => setMissionCompletionType(option.value)}
                            className={`flex-row items-center p-4 rounded-lg border ${
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
                                {option.title}
                              </Text>
                              <Text className="text-xs text-gray-500 mt-0.5">
                                {option.description}
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {missionCompletionType === 'periodic' && (
                      <View className="mt-3">
                        <Text className="text-sm text-gray-700 mb-2">{t('mandalart.modal.mission.periodCycle')}</Text>
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
                                {option.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Reference Info */}
                {selectedType === 'reference' && (
                  <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                    <View className="flex-row items-center">
                      <Info size={16} color="#6b7280" />
                      <Text className="text-sm text-gray-500 ml-2">
                        {t('mandalart.modal.referenceInfo')}
                      </Text>
                    </View>
                  </View>
                )}

                <View className="h-8" />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
