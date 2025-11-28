import React, { useState, useEffect, useCallback } from 'react'
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
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { ActionTypeData } from './ActionTypeSelector'
import SortableList from './SortableList'
import {
  getActionTypeLabel,
  formatTypeDetails,
  suggestActionType,
  getRoutineFrequencyLabel,
  getPeriodCycleLabel,
  getWeekdayNames,
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

// Type selector constants
const TYPE_OPTIONS: { type: ActionType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'routine',
    label: '루틴',
    description: '매일, 매주, 매월 등 반복적으로 실천하는 항목',
    icon: <RotateCw size={20} color="#3b82f6" />,
  },
  {
    type: 'mission',
    label: '미션',
    description: '끝이 있는 목표 (책 1권 읽기, 자격증 취득 등)',
    icon: <Target size={20} color="#10b981" />,
  },
  {
    type: 'reference',
    label: '참고',
    description: '마음가짐, 가치관 등 체크가 필요없는 참고 항목',
    icon: <Lightbulb size={20} color="#f59e0b" />,
  },
]

const FREQUENCY_OPTIONS: { value: RoutineFrequency; label: string }[] = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
]

const WEEKLY_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const MONTHLY_COUNT_OPTIONS = [1, 2, 3, 5, 10, 20, 30]

const MISSION_COMPLETION_OPTIONS: { value: MissionCompletionType; label: string }[] = [
  { value: 'once', label: '1회 완료 (예: 자격증 취득, 책 읽기)' },
  { value: 'periodic', label: '주기적 목표 (예: 월간 매출 목표, 분기별 평가)' },
]

const PERIOD_CYCLE_OPTIONS: { value: MissionPeriodCycle; label: string }[] = [
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
  { value: 'quarterly', label: '분기별' },
  { value: 'yearly', label: '매년' },
]

const getConfidenceLabel = (confidence: string) => {
  switch (confidence) {
    case 'high':
      return '높음'
    case 'medium':
      return '중간'
    default:
      return '낮음'
  }
}

export default function SubGoalEditModal({
  visible,
  subGoal,
  onClose,
  onSuccess,
}: SubGoalEditModalProps) {
  const toast = useToast()

  // Local state
  const [subGoalTitle, setSubGoalTitle] = useState('')
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

  const weekdays = getWeekdayNames()

  useEffect(() => {
    if (visible && subGoal) {
      setSubGoalTitle(subGoal.title)
      setActions([...subGoal.actions].sort((a, b) => a.position - b.position))
      setIsEditingSubGoalTitle(false)
      setEditingActionId(null)
      setViewMode('list')
      setSelectedAction(null)
    }
  }, [visible, subGoal])

  // Sub-goal title save
  const handleSubGoalTitleSave = useCallback(async () => {
    if (!subGoal || subGoalTitle.trim() === '') {
      toast.error('세부목표를 입력하세요')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('sub_goals')
        .update({ title: subGoalTitle.trim() })
        .eq('id', subGoal.id)

      if (error) throw error

      setIsEditingSubGoalTitle(false)
      toast.success('저장되었습니다')
      onSuccess?.()
    } catch (err) {
      console.error('SubGoal title save error:', err)
      toast.error('저장 중 오류가 발생했습니다')
      setSubGoalTitle(subGoal.title)
    } finally {
      setIsSaving(false)
    }
  }, [subGoal, subGoalTitle, toast, onSuccess])

  // Action title save
  const handleActionTitleSave = useCallback(async (actionId: string) => {
    if (editingActionTitle.trim() === '') {
      toast.error('제목을 입력하세요')
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

      toast.success('저장되었습니다')
      onSuccess?.()
    } catch (err) {
      console.error('Action title save error:', err)
      toast.error('저장 중 오류가 발생했습니다')
      onSuccess?.()
    }
  }, [editingActionTitle, toast, onSuccess])

  // Open type selector with action's current data
  const openTypeSelector = useCallback((action: Action) => {
    setSelectedAction(action)
    setSelectedType(action.type)
    setRoutineFrequency(action.routine_frequency || 'daily')
    setRoutineWeekdays(action.routine_weekdays || [])
    setRoutineCountPerPeriod(action.routine_count_per_period || 1)
    setMissionCompletionType(action.mission_completion_type || 'once')
    setMissionPeriodCycle(action.mission_period_cycle || 'monthly')

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
    if (!selectedAction) return

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
    try {
      const { error } = await supabase
        .from('actions')
        .update({
          type: typeData.type,
          routine_frequency: typeData.routine_frequency,
          routine_weekdays: typeData.routine_weekdays,
          routine_count_per_period: typeData.routine_count_per_period,
          mission_completion_type: typeData.mission_completion_type,
          mission_period_cycle: typeData.mission_period_cycle,
          mission_current_period_start: typeData.mission_current_period_start,
          mission_current_period_end: typeData.mission_current_period_end,
          ai_suggestion: typeData.ai_suggestion ? JSON.stringify(typeData.ai_suggestion) : null,
        })
        .eq('id', actionId)

      if (error) throw error

      toast.success('타입이 변경되었습니다')
      onSuccess?.()
    } catch (err) {
      console.error('Type update error:', err)
      toast.error('타입 변경 중 오류가 발생했습니다')
      onSuccess?.() // Refresh to get correct data
    }
  }, [selectedAction, selectedType, routineFrequency, routineWeekdays, routineCountPerPeriod, missionCompletionType, missionPeriodCycle, aiSuggestion, toast, onSuccess])

  // Action delete
  const handleActionDelete = useCallback((action: Action) => {
    Alert.alert(
      '실천항목 삭제',
      `"${action.title}"을(를) 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
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

              toast.success('삭제되었습니다')
              onSuccess?.()
            } catch (err) {
              console.error('Action delete error:', err)
              toast.error('삭제 중 오류가 발생했습니다')
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

    if (actions.length >= 8) {
      toast.error('실천항목은 최대 8개까지 추가할 수 있습니다')
      return
    }

    const newPosition = actions.length > 0
      ? Math.max(...actions.map((a) => a.position)) + 1
      : 1

    try {
      const { data, error } = await supabase
        .from('actions')
        .insert({
          sub_goal_id: subGoal.id,
          title: '새 실천항목',
          position: newPosition,
          type: 'routine',
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
      toast.error('추가 중 오류가 발생했습니다')
    }
  }, [subGoal, actions, toast, onSuccess])

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
      toast.error('순서 변경 중 오류가 발생했습니다')
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
              className="bg-white rounded-t-3xl"
              style={{ maxHeight: '85%' }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header - changes based on viewMode */}
              {viewMode === 'list' ? (
                <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                  <Text className="text-lg font-semibold text-gray-900">
                    세부목표 수정
                  </Text>
                  <Pressable onPress={onClose} className="p-1">
                    <X size={24} color="#6b7280" />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                  <Pressable
                    onPress={() => {
                      setViewMode('list')
                      setSelectedAction(null)
                    }}
                    className="p-1"
                  >
                    <ChevronLeft size={24} color="#6b7280" />
                  </Pressable>
                  <Text className="text-lg font-semibold text-gray-900">
                    타입 설정
                  </Text>
                  <Pressable
                    onPress={handleTypeSelectorSave}
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
              <ScrollView style={{ padding: 16 }}>
                <Text className="text-sm text-gray-500 mb-4">
                  세부목표와 실천항목을 수정할 수 있습니다
                </Text>

                {/* Sub-goal Title */}
                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    세부목표
                  </Text>
                  {isEditingSubGoalTitle ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <TextInput
                        value={subGoalTitle}
                        onChangeText={setSubGoalTitle}
                        placeholder="세부목표 제목을 입력하세요"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-base"
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
                      className="flex-row items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <Text className="flex-1 text-base text-gray-900">
                        {subGoalTitle}
                      </Text>
                      <Pencil size={16} color="#9ca3af" />
                    </Pressable>
                  )}
                </View>

                {/* Actions List */}
                <View className="mb-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-medium text-gray-700">
                      실천 항목 ({actions.length}/8)
                    </Text>
                    {actions.length < 8 && (
                      <Pressable
                        onPress={handleActionAdd}
                        className="flex-row items-center px-3 py-1.5 border border-gray-300 rounded-lg"
                      >
                        <Plus size={16} color="#667eea" />
                        <Text className="text-sm text-primary ml-1">추가</Text>
                      </Pressable>
                    )}
                  </View>

                  {actions.length === 0 ? (
                    <View className="py-8 border border-dashed border-gray-300 rounded-lg">
                      <Text className="text-sm text-gray-400 text-center">
                        실천 항목이 없습니다.{'\n'}추가 버튼을 클릭하여 항목을 추가하세요.
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
                              <Text className="text-sm text-gray-400 ml-1 w-5">
                                {idx + 1}.
                              </Text>
                            </View>

                            {/* Action Content */}
                            <View className="flex-1">
                              {editingActionId === action.id ? (
                                <View className="flex-row items-center" style={{ gap: 8 }}>
                                  <TextInput
                                    value={editingActionTitle}
                                    onChangeText={setEditingActionTitle}
                                    className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
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
                                  <Text className="text-sm text-gray-900">
                                    {action.title}
                                  </Text>
                                </Pressable>
                              )}
                            </View>

                            {/* Type Badge */}
                            <Pressable
                              onPress={() => openTypeSelector(action)}
                              className="flex-row items-center px-2 py-1 bg-gray-100 rounded ml-2 active:bg-gray-200"
                            >
                              <ActionTypeIcon type={action.type} size={12} />
                              <Text className="text-xs text-gray-600 ml-1">
                                {formatTypeDetails(action) || getActionTypeLabel(action.type)}
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
              <ScrollView style={{ padding: 16 }}>
                {/* Action Title */}
                {selectedAction && (
                  <Text className="text-sm text-gray-500 mb-4">
                    "{selectedAction.title}"의 타입과 세부 설정을 선택하세요
                  </Text>
                )}

                {/* AI Suggestion */}
                {aiSuggestion && (
                  <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                    <Text className="text-sm font-medium text-blue-900">
                      💡 자동 추천: {getActionTypeLabel(aiSuggestion.type as ActionType)}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Info size={12} color="#1e40af" />
                      <Text className="text-xs text-blue-700 ml-1 flex-1">
                        {aiSuggestion.reason} (신뢰도: {getConfidenceLabel(aiSuggestion.confidence)})
                      </Text>
                    </View>
                  </View>
                )}

                {/* Type Selection */}
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    실천 항목 타입
                  </Text>
                  <View style={{ gap: 8 }}>
                    {TYPE_OPTIONS.map((option) => (
                      <Pressable
                        key={option.type}
                        onPress={() => setSelectedType(option.type)}
                        className={`flex-row items-center p-3 rounded-xl border ${
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
                      루틴 설정
                    </Text>

                    {/* Frequency Select - Button Style */}
                    <View className="mb-3">
                      <Text className="text-sm text-gray-700 mb-2">반복 주기</Text>
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

                    {/* Weekly Weekdays Selection */}
                    {routineFrequency === 'weekly' && (
                      <View className="mb-3">
                        <Text className="text-sm text-gray-700 mb-2">
                          주중 실천 요일 선택 (선택사항)
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
                            요일을 선택하지 않으면 주간 횟수 기반으로 설정됩니다
                          </Text>
                        </View>

                        {/* Weekly Count (when no weekdays selected) */}
                        {routineWeekdays.length === 0 && (
                          <View className="mt-3">
                            <Text className="text-sm text-gray-700 mb-2">주간 목표 횟수</Text>
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
                        <Text className="text-sm text-gray-700 mb-2">월간 목표 횟수</Text>
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
                            매일 실천하는 항목은 반복 주기를 '매일'로 선택하세요
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
                      미션 설정
                    </Text>

                    {/* Completion Type */}
                    <View className="mb-3">
                      <Text className="text-sm text-gray-700 mb-2">완료 방식</Text>
                      <View style={{ gap: 8 }}>
                        {MISSION_COMPLETION_OPTIONS.map((option) => (
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
                            <Text className="text-sm text-gray-700 flex-1">
                              {option.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Period Cycle (for periodic missions) */}
                    {missionCompletionType === 'periodic' && (
                      <View className="mt-3">
                        <Text className="text-sm text-gray-700 mb-2">반복 주기</Text>
                        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                          {PERIOD_CYCLE_OPTIONS.map((option) => (
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
                        참고 타입은 달성률에 포함되지 않습니다
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
