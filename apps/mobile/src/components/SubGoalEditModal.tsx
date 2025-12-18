import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
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
  Plus,
  RotateCw,
  Target,
  Lightbulb,
  ChevronLeft,
  Info,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { ActionTypeData } from './ActionTypeSelector'
import SortableList from './SortableList'
import {
  suggestActionType,
  getInitialPeriod,
  type Action,
  type SubGoal,
  type ActionType,
  type RoutineFrequency,
  type MissionCompletionType,
  type MissionPeriodCycle,
} from '@mandaact/shared'

interface SubGoalWithActions extends SubGoal {
  actions: Action[]
}

interface SubGoalEditModalProps {
  visible: boolean
  subGoal: SubGoalWithActions | null
  onClose: () => void
  onSuccess?: () => void
}

// Action type icon component
function ActionTypeIcon({ type, size = 14 }: { type: ActionType; size?: number }) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#3b82f6" />
    case 'mission':
      return <Target size={size} color="#10b981" />
    case 'reference':
      return <Lightbulb size={size} color="#f59e0b" />
    default:
      return null
  }
}

// Type selector constants - will be created with translation in component
const WEEKLY_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const MONTHLY_COUNT_OPTIONS = [1, 2, 3, 5, 10, 20, 30]

export default function SubGoalEditModal({
  visible,
  subGoal,
  onClose,
  onSuccess,
}: SubGoalEditModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Translated constants
  const TYPE_OPTIONS = useMemo(() => [
    {
      type: 'routine' as ActionType,
      label: t('actionType.routine'),
      description: t('actionType.selector.routineDesc'),
      icon: <RotateCw size={20} color="#3b82f6" />,
    },
    {
      type: 'mission' as ActionType,
      label: t('actionType.mission'),
      description: t('actionType.selector.missionDesc'),
      icon: <Target size={20} color="#10b981" />,
    },
    {
      type: 'reference' as ActionType,
      label: t('actionType.reference'),
      description: t('actionType.selector.referenceDesc'),
      icon: <Lightbulb size={20} color="#f59e0b" />,
    },
  ], [t])

  const FREQUENCY_OPTIONS = useMemo(() => [
    { value: 'daily' as RoutineFrequency, label: t('actionType.daily') },
    { value: 'weekly' as RoutineFrequency, label: t('actionType.weekly') },
    { value: 'monthly' as RoutineFrequency, label: t('actionType.monthly') },
  ], [t])

  const MISSION_COMPLETION_OPTIONS = useMemo(() => [
    {
      value: 'once' as MissionCompletionType,
      title: t('actionType.once'),
      description: t('actionType.selector.onceDesc'),
    },
    {
      value: 'periodic' as MissionCompletionType,
      title: t('actionType.periodic'),
      description: t('actionType.selector.periodicDesc'),
    },
  ], [t])

  const PERIOD_CYCLE_OPTIONS = useMemo(() => [
    { value: 'daily' as MissionPeriodCycle, label: t('actionType.daily') },
    { value: 'weekly' as MissionPeriodCycle, label: t('actionType.weekly') },
    { value: 'monthly' as MissionPeriodCycle, label: t('actionType.monthly') },
    { value: 'quarterly' as MissionPeriodCycle, label: t('actionType.quarterly') },
    { value: 'yearly' as MissionPeriodCycle, label: t('actionType.yearly') },
  ], [t])

  const weekdays = useMemo(() => [
    { value: 1, label: t('actionType.weekdayShort.mon'), short: t('actionType.weekdayShort.mon') },
    { value: 2, label: t('actionType.weekdayShort.tue'), short: t('actionType.weekdayShort.tue') },
    { value: 3, label: t('actionType.weekdayShort.wed'), short: t('actionType.weekdayShort.wed') },
    { value: 4, label: t('actionType.weekdayShort.thu'), short: t('actionType.weekdayShort.thu') },
    { value: 5, label: t('actionType.weekdayShort.fri'), short: t('actionType.weekdayShort.fri') },
    { value: 6, label: t('actionType.weekdayShort.sat'), short: t('actionType.weekdayShort.sat') },
    { value: 0, label: t('actionType.weekdayShort.sun'), short: t('actionType.weekdayShort.sun') },
  ], [t])

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return t('mandalart.subGoalEdit.confidenceHigh')
      case 'medium':
        return t('mandalart.subGoalEdit.confidenceMedium')
      default:
        return t('mandalart.subGoalEdit.confidenceLow')
    }
  }

  const getTranslatedSuggestionReason = (suggestion: { type: string; reason?: string }) => {
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

  // Get translated action type label
  const getTranslatedTypeLabel = (type: ActionType) => {
    return t(`actionType.${type}`)
  }

  // Get translated type details string
  const getTranslatedTypeDetails = (action: Action): string => {
    if (action.type === 'routine') {
      if (action.routine_frequency === 'daily') {
        return t('actionType.daily')
      }
      if (action.routine_frequency === 'weekly') {
        if (action.routine_weekdays && action.routine_weekdays.length > 0) {
          // Sort weekdays starting from Monday (1-6, 0)
          const sortedWeekdays = [...action.routine_weekdays].sort((a, b) => {
            const aVal = a === 0 ? 7 : a
            const bVal = b === 0 ? 7 : b
            return aVal - bVal
          })

          // Check for weekdays (Mon-Fri): [1,2,3,4,5]
          const isWeekdays = sortedWeekdays.length === 5 &&
            sortedWeekdays.every((day, idx) => day === idx + 1)

          // Check for weekend (Sat-Sun): [6, 0]
          const isWeekend = sortedWeekdays.length === 2 &&
            sortedWeekdays[0] === 6 &&
            sortedWeekdays[1] === 0

          if (isWeekdays) {
            return t('actionType.format.weekday')
          }

          if (isWeekend) {
            return t('actionType.format.weekend')
          }

          // Default: show individual days
          const dayNames = sortedWeekdays.map(d => {
            const dayMap: Record<number, string> = {
              0: t('actionType.weekdayShort.sun'),
              1: t('actionType.weekdayShort.mon'),
              2: t('actionType.weekdayShort.tue'),
              3: t('actionType.weekdayShort.wed'),
              4: t('actionType.weekdayShort.thu'),
              5: t('actionType.weekdayShort.fri'),
              6: t('actionType.weekdayShort.sat'),
            }
            return dayMap[d] || ''
          }).join(', ')
          return dayNames
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
      return t('mandalart.subGoalEdit.notSet')
    }
    if (action.type === 'mission') {
      if (action.mission_completion_type === 'once') {
        return t('actionType.once')
      }
      if (action.mission_completion_type === 'periodic') {
        return t(`actionType.${action.mission_period_cycle || 'monthly'}`)
      }
      // mission_completion_type이 null이면 미션 타입만 표시
      return t('actionType.mission')
    }
    if (action.type === 'reference') {
      return t('actionType.reference')
    }
    return t('mandalart.subGoalEdit.notSet')
  }

  // Local state
  const [subGoalTitle, setSubGoalTitle] = useState('')
  const [subGoalId, setSubGoalId] = useState<string>('') // Track the actual subGoal id
  const [actions, setActions] = useState<Action[]>([])
  const [isEditingSubGoalTitle, setIsEditingSubGoalTitle] = useState(false)
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [editingActionTitle, setEditingActionTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Type selector state - now as view mode instead of separate modal
  const [viewMode, setViewMode] = useState<'list' | 'typeSelector'>('list')
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)

  // Type selector form state
  const [selectedType, setSelectedType] = useState<ActionType>('routine')
  const [routineFrequency, setRoutineFrequency] = useState<RoutineFrequency>('daily')
  const [routineWeekdays, setRoutineWeekdays] = useState<number[]>([])
  const [routineCountPerPeriod, setRoutineCountPerPeriod] = useState<number>(1)
  const [missionCompletionType, setMissionCompletionType] = useState<MissionCompletionType>('once')
  const [missionPeriodCycle, setMissionPeriodCycle] = useState<MissionPeriodCycle>('monthly')
  const [aiSuggestion, setAiSuggestion] = useState<{ type: string; confidence: string; reason: string } | null>(null)

  // Custom input states
  const [showCustomMonthlyInput, setShowCustomMonthlyInput] = useState(false)
  const [customMonthlyValue, setCustomMonthlyValue] = useState('')

  // Check if this is a new sub-goal (empty id means creating new)
  const isNewSubGoal = subGoalId === ''

  useEffect(() => {
    if (visible && subGoal) {
      console.log('[useEffect] Syncing modal state from subGoal prop')
      console.log('[useEffect] subGoal.actions:', subGoal.actions.map(a => ({
        id: a.id.slice(0, 8),
        title: a.title.slice(0, 20),
        type: a.type,
        mission_period_cycle: a.mission_period_cycle,
      })))
      setSubGoalTitle(subGoal.title)
      setSubGoalId(subGoal.id) // Initialize subGoalId from prop
      setActions([...subGoal.actions].sort((a, b) => a.position - b.position))
      // Auto-start editing title for new sub-goals
      setIsEditingSubGoalTitle(subGoal.id === '')
      setEditingActionId(null)
      setViewMode('list')
      setSelectedAction(null)
    }
  }, [visible, subGoal])

  // Sub-goal title save (handles both create and update)
  const handleSubGoalTitleSave = useCallback(async () => {
    if (!subGoal || subGoalTitle.trim() === '') {
      toast.error(t('mandalart.subGoalEdit.toast.enterSubGoal'))
      return
    }

    setIsSaving(true)
    try {
      if (isNewSubGoal) {
        // Create new sub-goal
        const { data, error } = await supabase
          .from('sub_goals')
          .insert({
            mandalart_id: subGoal.mandalart_id,
            position: subGoal.position,
            title: subGoalTitle.trim(),
          })
          .select()
          .single()

        if (error) throw error

        // Update the local subGoalId state so we can add actions
        if (data) {
          setSubGoalId(data.id)
        }

        setIsEditingSubGoalTitle(false)
        toast.success(t('mandalart.subGoalEdit.toast.subGoalCreated'))
        onSuccess?.()
        // Don't close modal - allow user to add actions
      } else {
        // Update existing sub-goal
        const { error } = await supabase
          .from('sub_goals')
          .update({ title: subGoalTitle.trim() })
          .eq('id', subGoalId)

        if (error) throw error

        setIsEditingSubGoalTitle(false)
        toast.success(t('mandalart.subGoalEdit.toast.saved'))
        onSuccess?.()
      }
    } catch (err) {
      console.error('SubGoal title save error:', err)
      toast.error(t('mandalart.subGoalEdit.toast.saveError'))
      setSubGoalTitle(subGoal.title)
    } finally {
      setIsSaving(false)
    }
  }, [subGoal, subGoalTitle, toast, onSuccess, onClose, isNewSubGoal])

  // Action title save
  const handleActionTitleSave = useCallback(async (actionId: string) => {
    if (editingActionTitle.trim() === '') {
      toast.error(t('mandalart.subGoalEdit.toast.enterTitle'))
      return
    }

    const trimmedTitle = editingActionTitle.trim()
    const aiSuggestion = suggestActionType(trimmedTitle)

    // Optimistic update
    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId
          ? { ...a, title: trimmedTitle, ai_suggestion: aiSuggestion }
          : a
      )
    )
    setEditingActionId(null)

    try {
      const { error } = await supabase
        .from('actions')
        .update({ title: trimmedTitle })
        .eq('id', actionId)

      if (error) throw error

      toast.success(t('mandalart.subGoalEdit.toast.saved'))
      onSuccess?.()
    } catch (err) {
      console.error('Action title save error:', err)
      toast.error(t('mandalart.subGoalEdit.toast.saveError'))
      onSuccess?.()
    }
  }, [editingActionTitle, toast, onSuccess])

  // Open type selector with action's current data
  const openTypeSelector = useCallback((action: Action) => {
    console.log('[openTypeSelector] Action data:', {
      id: action.id,
      type: action.type,
      mission_completion_type: action.mission_completion_type,
      mission_period_cycle: action.mission_period_cycle,
    })
    setSelectedAction(action)
    setSelectedType(action.type)
    setRoutineFrequency(action.routine_frequency || 'daily')
    setRoutineWeekdays(action.routine_weekdays || [])
    setRoutineCountPerPeriod(action.routine_count_per_period || 1)
    setMissionCompletionType(action.mission_completion_type || 'once')
    setMissionPeriodCycle(action.mission_period_cycle || 'monthly')
    console.log('[openTypeSelector] Setting missionPeriodCycle to:', action.mission_period_cycle || 'monthly')

    // Generate fresh AI suggestion
    const freshSuggestion = suggestActionType(action.title)
    setAiSuggestion({
      type: freshSuggestion.type,
      confidence: freshSuggestion.confidence,
      reason: freshSuggestion.reason,
    })

    // Reset custom input states
    setShowCustomMonthlyInput(false)
    setCustomMonthlyValue('')

    setViewMode('typeSelector')
  }, [])

  // Handle weekday toggle
  const handleWeekdayToggle = useCallback((day: number) => {
    setRoutineWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }, [])

  // Action type save - now uses inline form state
  const handleTypeSelectorSave = useCallback(async () => {
    console.log('=== [handleTypeSelectorSave] START ===')
    console.log('[handleTypeSelectorSave] selectedAction:', selectedAction?.id || 'null')
    console.log('[handleTypeSelectorSave] All relevant state:', {
      selectedType,
      missionCompletionType,
      missionPeriodCycle,
      missionPeriodCycleType: typeof missionPeriodCycle,
    })

    if (!selectedAction) {
      console.log('[handleTypeSelectorSave] Early return: selectedAction is null')
      return
    }

    const actionId = selectedAction.id

    // Build type data from form state
    const typeData: ActionTypeData = {
      type: selectedType,
      ai_suggestion: aiSuggestion || undefined,
    }

    if (selectedType === 'routine') {
      typeData.routine_frequency = routineFrequency
      if (routineFrequency === 'weekly') {
        if (routineWeekdays.length > 0) {
          typeData.routine_weekdays = routineWeekdays
        } else {
          typeData.routine_count_per_period = routineCountPerPeriod || 1
        }
      } else if (routineFrequency === 'monthly') {
        typeData.routine_count_per_period = routineCountPerPeriod || 1
      }
    } else if (selectedType === 'mission') {
      typeData.mission_completion_type = missionCompletionType
      if (missionCompletionType === 'periodic') {
        typeData.mission_period_cycle = missionPeriodCycle
        const { start, end } = getInitialPeriod(missionPeriodCycle)
        typeData.mission_current_period_start = start.toISOString()
        typeData.mission_current_period_end = end.toISOString()
      }
    }

    // Optimistic update - update local state
    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId
          ? {
              ...a,
              type: typeData.type,
              routine_frequency: typeData.routine_frequency,
              routine_weekdays: typeData.routine_weekdays,
              routine_count_per_period: typeData.routine_count_per_period,
              mission_completion_type: typeData.mission_completion_type,
              mission_period_cycle: typeData.mission_period_cycle,
              mission_current_period_start: typeData.mission_current_period_start,
              mission_current_period_end: typeData.mission_current_period_end,
              ai_suggestion: typeData.ai_suggestion,
            }
          : a
      )
    )

    setViewMode('list')
    setSelectedAction(null)

    // Save to DB
    console.log('[DB Save] Saving typeData:', JSON.stringify(typeData, null, 2))
    try {
      const updateData = {
        type: typeData.type,
        routine_frequency: typeData.routine_frequency || null,
        routine_weekdays: typeData.routine_weekdays || null,
        routine_count_per_period: typeData.routine_count_per_period || null,
        mission_completion_type: typeData.mission_completion_type || null,
        mission_period_cycle: typeData.mission_period_cycle || null,
        mission_current_period_start: typeData.mission_current_period_start || null,
        mission_current_period_end: typeData.mission_current_period_end || null,
        ai_suggestion: typeData.ai_suggestion ? JSON.stringify(typeData.ai_suggestion) : null,
      }
      console.log('[DB Save] Update data:', JSON.stringify(updateData, null, 2))

      const { error, data } = await supabase
        .from('actions')
        .update(updateData)
        .eq('id', actionId)
        .select()

      console.log('[DB Save] Result error:', error)
      console.log('[DB Save] Result data:', JSON.stringify(data, null, 2))
      if (data && data[0]) {
        console.log('[DB Save] Returned mission_period_cycle:', data[0].mission_period_cycle)
      }

      if (error) throw error

      toast.success(t('mandalart.subGoalEdit.toast.typeChanged'))
      // Invalidate today actions cache so TodayScreen shows updated data
      queryClient.invalidateQueries({ queryKey: ['actions'] })
      onSuccess?.()
    } catch (err) {
      console.error('Type update error:', err)
      toast.error(t('mandalart.subGoalEdit.toast.typeChangeError'))
      onSuccess?.() // Refresh to get correct data
    }
  }, [selectedAction, selectedType, routineFrequency, routineWeekdays, routineCountPerPeriod, missionCompletionType, missionPeriodCycle, aiSuggestion, toast, queryClient, onSuccess])

  // Action delete
  const handleActionDelete = useCallback((action: Action) => {
    Alert.alert(
      t('mandalart.subGoalEdit.deleteAction.title'),
      t('mandalart.subGoalEdit.deleteAction.message', { title: action.title }),
      [
        { text: t('mandalart.subGoalEdit.deleteAction.cancel'), style: 'cancel' },
        {
          text: t('mandalart.subGoalEdit.deleteAction.delete'),
          style: 'destructive',
          onPress: async () => {
            const remainingActions = actions.filter((a) => a.id !== action.id)
            setActions(remainingActions)

            try {
              const { error } = await supabase
                .from('actions')
                .delete()
                .eq('id', action.id)

              if (error) throw error

              // Reorder remaining actions
              await Promise.all(
                remainingActions
                  .sort((a, b) => a.position - b.position)
                  .map((a, idx) =>
                    supabase
                      .from('actions')
                      .update({ position: idx + 1 })
                      .eq('id', a.id)
                  )
              )

              toast.success(t('mandalart.subGoalEdit.toast.deleted'))
              onSuccess?.()
            } catch (err) {
              console.error('Action delete error:', err)
              toast.error(t('mandalart.subGoalEdit.toast.deleteError'))
              onSuccess?.()
            }
          },
        },
      ]
    )
  }, [actions, toast, onSuccess])

  // Action add
  const handleActionAdd = useCallback(async () => {
    if (!subGoal) return

    // New sub-goal: must save title first
    if (isNewSubGoal) {
      toast.error(t('mandalart.subGoalEdit.toast.saveSubGoalFirst'))
      return
    }

    if (actions.length >= 8) {
      toast.error(t('mandalart.subGoalEdit.toast.maxActions'))
      return
    }

    const newPosition = actions.length > 0
      ? Math.max(...actions.map((a) => a.position)) + 1
      : 1

    try {
      const { data, error } = await supabase
        .from('actions')
        .insert({
          sub_goal_id: subGoalId, // Use state instead of prop
          title: t('mandalart.subGoalEdit.newAction'),
          position: newPosition,
          type: 'routine',
          routine_frequency: null,
        })
        .select()
        .single()

      if (error) throw error

      setActions((prev) => [...prev, data as Action])
      setEditingActionId(data.id)
      setEditingActionTitle(data.title)
      onSuccess?.()
    } catch (err) {
      console.error('Action add error:', err)
      toast.error(t('mandalart.subGoalEdit.toast.addError'))
    }
  }, [subGoal, subGoalId, actions, toast, onSuccess, isNewSubGoal])

  // Handle drag end - reorder actions
  const handleDragEnd = useCallback(async (reorderedActions: Action[]) => {
    // Update positions
    const updatedActions = reorderedActions.map((a, idx) => ({
      ...a,
      position: idx + 1,
    }))

    setActions(updatedActions)

    try {
      await Promise.all(
        updatedActions.map((a) =>
          supabase
            .from('actions')
            .update({ position: a.position })
            .eq('id', a.id)
        )
      )
      onSuccess?.()
    } catch (err) {
      console.error('Reorder action error:', err)
      toast.error(t('mandalart.subGoalEdit.toast.reorderError'))
      onSuccess?.()
    }
  }, [toast, onSuccess])

  if (!subGoal) return null

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-end"
            onPress={onClose}
          >
            <Pressable
              className="bg-white rounded-t-2xl"
              style={{ maxHeight: '85%' }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header - changes based on viewMode */}
              {viewMode === 'list' ? (
                <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
                  <Text
                    className="text-lg text-gray-900"
                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                  >
                    {t('mandalart.subGoalEdit.title')}
                  </Text>
                  <Pressable onPress={onClose} className="p-1">
                    <X size={24} color="#6b7280" />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
                  <Pressable
                    onPress={() => {
                      setViewMode('list')
                      setSelectedAction(null)
                    }}
                    className="p-1"
                  >
                    <ChevronLeft size={24} color="#6b7280" />
                  </Pressable>
                  <Text
                    className="text-lg text-gray-900"
                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                  >
                    {t('mandalart.subGoalEdit.typeSettings')}
                  </Text>
                  <Pressable
                    onPress={() => {
                      console.log('[Save Button] Pressed, isSaving:', isSaving)
                      handleTypeSelectorSave()
                    }}
                    disabled={isSaving}
                    className="p-1"
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#374151" />
                    ) : (
                      <Check size={24} color="#374151" />
                    )}
                  </Pressable>
                </View>
              )}

              {/* Content based on viewMode */}
              {viewMode === 'list' ? (
              <ScrollView style={{ padding: 20 }}>
                <Text
                  className="text-sm text-gray-500 mb-4"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  {t('mandalart.subGoalEdit.description')}
                </Text>

                {/* Sub-goal Title */}
                <View className="mb-6">
                  <Text
                    className="text-sm text-gray-700 mb-2"
                    style={{ fontFamily: 'Pretendard-Medium' }}
                  >
                    {t('mandalart.subGoalEdit.subGoalLabel')}
                  </Text>
                  {isEditingSubGoalTitle ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <TextInput
                        value={subGoalTitle}
                        onChangeText={setSubGoalTitle}
                        placeholder={t('mandalart.subGoalEdit.subGoalPlaceholder')}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                        autoFocus
                        onSubmitEditing={handleSubGoalTitleSave}
                      />
                      <Pressable
                        onPress={handleSubGoalTitleSave}
                        disabled={isSaving}
                        className="p-2"
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                          <Check size={20} color="#10b981" />
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setSubGoalTitle(subGoal.title)
                          setIsEditingSubGoalTitle(false)
                        }}
                        className="p-2"
                      >
                        <X size={20} color="#6b7280" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setIsEditingSubGoalTitle(true)}
                      className="flex-row items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <Text
                        className="flex-1 text-base text-gray-900"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                      >
                        {subGoalTitle}
                      </Text>
                      <Pencil size={16} color="#9ca3af" />
                    </Pressable>
                  )}
                </View>

                {/* Actions List */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text
                      className="text-sm text-gray-700"
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      {t('mandalart.subGoalEdit.actions')} ({actions.length}/8)
                    </Text>
                    {actions.length < 8 && (
                      <Pressable
                        onPress={handleActionAdd}
                        className="flex-row items-center px-3 py-2 border border-gray-200 rounded-lg bg-white"
                      >
                        <Plus size={16} color="#2563eb" />
                        <Text
                          className="text-sm text-primary ml-1"
                          style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                          {t('mandalart.subGoalEdit.add')}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {actions.length === 0 ? (
                    <View className="py-8 border border-dashed border-gray-300 rounded-lg">
                      <Text
                        className="text-sm text-gray-400 text-center"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                      >
                        {t('mandalart.subGoalEdit.noActions')}
                      </Text>
                    </View>
                  ) : (
                    <GestureHandlerRootView>
                      <SortableList
                        data={actions}
                        keyExtractor={(action) => action.id}
                        itemHeight={52}
                        onDragEnd={handleDragEnd}
                        renderItem={({ item: action, index: idx }) => (
                          <View className="flex-row items-center bg-white border border-gray-200 rounded-lg p-2 mb-2">
                            {/* Handle + Position */}
                            <View className="flex-row items-center mr-2">
                              <GripVertical size={16} color="#9ca3af" />
                              <Text
                                className="text-sm text-gray-400 ml-1 w-5"
                                style={{ fontFamily: 'Pretendard-Regular' }}
                              >
                                {idx + 1}.
                              </Text>
                            </View>

                            {/* Action Content */}
                            <View className="flex-1">
                              {editingActionId === action.id ? (
                                <View className="flex-row items-center" style={{ gap: 4 }}>
                                  <TextInput
                                    value={editingActionTitle}
                                    onChangeText={setEditingActionTitle}
                                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                                    style={{ fontFamily: 'Pretendard-Regular' }}
                                    autoFocus
                                    onSubmitEditing={() => handleActionTitleSave(action.id)}
                                  />
                                  <Pressable
                                    onPress={() => handleActionTitleSave(action.id)}
                                    className="p-1"
                                  >
                                    <Check size={18} color="#10b981" />
                                  </Pressable>
                                  <Pressable
                                    onPress={() => {
                                      setEditingActionId(null)
                                      setEditingActionTitle('')
                                    }}
                                    className="p-1"
                                  >
                                    <X size={18} color="#6b7280" />
                                  </Pressable>
                                </View>
                              ) : (
                                <Pressable
                                  onPress={() => {
                                    setEditingActionId(action.id)
                                    setEditingActionTitle(action.title)
                                  }}
                                  className="py-1"
                                >
                                  <Text
                                    className="text-sm text-gray-900"
                                    style={{ fontFamily: 'Pretendard-Regular' }}
                                  >
                                    {action.title}
                                  </Text>
                                </Pressable>
                              )}
                            </View>

                            {/* Type Badge */}
                            <Pressable
                              onPress={() => openTypeSelector(action)}
                              className="flex-row items-center px-2.5 py-1.5 bg-gray-100 rounded-lg ml-2 active:bg-gray-200"
                            >
                              <ActionTypeIcon type={action.type} size={12} />
                              <Text
                                className="text-xs text-gray-600 ml-1"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                              >
                                {getTranslatedTypeDetails(action)}
                              </Text>
                            </Pressable>

                            {/* Delete */}
                            <Pressable
                              onPress={() => handleActionDelete(action)}
                              className="p-1.5 ml-2"
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </Pressable>
                          </View>
                        )}
                      />
                    </GestureHandlerRootView>
                  )}
                </View>

                {/* Bottom padding */}
                <View className="h-8" />
              </ScrollView>
              ) : (
              /* Type Selector View */
              <ScrollView style={{ padding: 20 }}>
                {/* Action Title */}
                {selectedAction && (
                  <Text
                    className="text-sm text-gray-500 mb-4"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {t('mandalart.subGoalEdit.selectTypeDesc', { title: selectedAction.title })}
                  </Text>
                )}

                {/* AI Suggestion */}
                {aiSuggestion && (
                  <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <Text
                      className="text-sm text-blue-900"
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      💡 {t('mandalart.subGoalEdit.autoSuggestion')}: {getTranslatedTypeLabel(aiSuggestion.type as ActionType)}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Info size={12} color="#1e40af" />
                      <Text
                        className="text-xs text-blue-700 ml-1 flex-1"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                      >
                        {getTranslatedSuggestionReason(aiSuggestion)} ({t('mandalart.subGoalEdit.confidence')}: {getConfidenceLabel(aiSuggestion.confidence)})
                      </Text>
                    </View>
                  </View>
                )}

                {/* Type Selection */}
                <View className="mb-4">
                  <Text
                    className="text-sm text-gray-700 mb-2"
                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                  >
                    {t('mandalart.modal.subGoal.actionTypeLabel')}
                  </Text>
                  <View style={{ gap: 8 }}>
                    {TYPE_OPTIONS.map((option) => (
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
                        <View className="mr-2">{option.icon}</View>
                        <View className="flex-1">
                          <Text
                            className="text-sm text-gray-900"
                            style={{ fontFamily: 'Pretendard-Medium' }}
                          >
                            {option.label}
                          </Text>
                          <Text
                            className="text-xs text-gray-500 mt-0.5"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                          >
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
                    <Text
                      className="text-base text-gray-900 mb-3"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      {t('mandalart.modal.routine.title')}
                    </Text>

                    {/* Frequency Select - Button Style */}
                    <View className="mb-3">
                      <Text
                        className="text-sm text-gray-700 mb-2"
                        style={{ fontFamily: 'Pretendard-Medium' }}
                      >
                        {t('mandalart.modal.routine.repeatCycle')}
                      </Text>
                      <View className="flex-row" style={{ gap: 8 }}>
                        {FREQUENCY_OPTIONS.map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => {
                              setRoutineFrequency(option.value)
                              // Reset count to appropriate default when frequency changes
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
                              className={`text-sm ${
                                routineFrequency === option.value
                                  ? 'text-white'
                                  : 'text-gray-700'
                              }`}
                              style={{ fontFamily: 'Pretendard-Medium' }}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Weekly Weekdays Selection */}
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
                        <View className="flex-row items-center mt-2">
                          <Info size={12} color="#9ca3af" />
                          <Text className="text-xs text-gray-400 ml-1">
                            {t('actionType.selector.weekdayHint')}
                          </Text>
                        </View>

                        {/* Weekly Count (when no weekdays selected) */}
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
                    <Text
                      className="text-base text-gray-900 mb-3"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      {t('mandalart.modal.mission.title')}
                    </Text>

                    {/* Completion Type */}
                    <View className="mb-3">
                      <Text
                        className="text-sm text-gray-700 mb-2"
                        style={{ fontFamily: 'Pretendard-Medium' }}
                      >
                        {t('mandalart.modal.mission.completionType')}
                      </Text>
                      <View style={{ gap: 8 }}>
                        {MISSION_COMPLETION_OPTIONS.map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => {
                              setMissionCompletionType(option.value)
                            }}
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
                              <Text
                                className="text-sm text-gray-900"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                              >
                                {option.title}
                              </Text>
                              <Text
                                className="text-xs text-gray-500 mt-0.5"
                                style={{ fontFamily: 'Pretendard-Regular' }}
                              >
                                {option.description}
                              </Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Period Cycle (for periodic missions) */}
                    {missionCompletionType === 'periodic' && (
                      <View className="mt-3">
                        <Text
                          className="text-sm text-gray-700 mb-2"
                          style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                          {t('mandalart.modal.mission.periodCycle')}
                        </Text>
                        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                          {PERIOD_CYCLE_OPTIONS.map((option) => (
                            <Pressable
                              key={option.value}
                              onPress={() => {
                                setMissionPeriodCycle(option.value)
                              }}
                              className={`px-4 py-2.5 rounded-lg border ${
                                missionPeriodCycle === option.value
                                  ? 'bg-gray-900 border-gray-900'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <Text
                                className={`text-sm ${
                                  missionPeriodCycle === option.value
                                    ? 'text-white'
                                    : 'text-gray-700'
                                }`}
                                style={{ fontFamily: 'Pretendard-Medium' }}
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
                      <Text
                        className="text-sm text-gray-500 ml-2"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                      >
                        {t('mandalart.modal.referenceInfo')}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Bottom spacing */}
                <View className="h-8" />
              </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}
