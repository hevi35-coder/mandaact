import { useState, useReducer, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubGoal, Action } from '@/types'
import ActionTypeSelector, { ActionTypeData } from '@/components/ActionTypeSelector'
import ActionListItem from '@/components/ActionListItem'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

interface SubGoalEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subGoal: SubGoal & { actions: Action[] }
  onEdit?: () => void
}

// Reducer for actions state management
type ActionsState = {
  actions: Action[]
  editingId: string | null
  editingTitle: string
  selectedAction: Action | null
  typeSelectorOpen: boolean
}

type ActionsAction =
  | { type: 'SET_ACTIONS'; payload: Action[] }
  | { type: 'ADD_ACTION'; payload: Action }
  | { type: 'UPDATE_ACTION'; payload: { id: string; updates: Partial<Action> } }
  | { type: 'DELETE_ACTION'; payload: string }
  | { type: 'REORDER_ACTIONS'; payload: Action[] }
  | { type: 'START_EDIT'; payload: { id: string; title: string } }
  | { type: 'UPDATE_EDIT_TITLE'; payload: string }
  | { type: 'CANCEL_EDIT' }
  | { type: 'OPEN_TYPE_SELECTOR'; payload: Action }
  | { type: 'CLOSE_TYPE_SELECTOR' }

function actionsReducer(state: ActionsState, action: ActionsAction): ActionsState {
  switch (action.type) {
    case 'SET_ACTIONS':
      return { ...state, actions: action.payload }

    case 'ADD_ACTION':
      return { ...state, actions: [...state.actions, action.payload] }

    case 'UPDATE_ACTION':
      return {
        ...state,
        actions: state.actions.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload.updates } : a
        )
      }

    case 'DELETE_ACTION':
      return {
        ...state,
        actions: state.actions.filter(a => a.id !== action.payload)
      }

    case 'REORDER_ACTIONS':
      return { ...state, actions: action.payload }

    case 'START_EDIT':
      return {
        ...state,
        editingId: action.payload.id,
        editingTitle: action.payload.title
      }

    case 'UPDATE_EDIT_TITLE':
      return { ...state, editingTitle: action.payload }

    case 'CANCEL_EDIT':
      return { ...state, editingId: null, editingTitle: '' }

    case 'OPEN_TYPE_SELECTOR':
      return {
        ...state,
        selectedAction: action.payload,
        typeSelectorOpen: true
      }

    case 'CLOSE_TYPE_SELECTOR':
      return {
        ...state,
        selectedAction: null,
        typeSelectorOpen: false
      }

    default:
      return state
  }
}

export default function SubGoalEditModal({
  open,
  onOpenChange,
  subGoal,
  onEdit
}: SubGoalEditModalProps) {
  const [isEditingSubGoalTitle, setIsEditingSubGoalTitle] = useState(false)
  const [subGoalTitle, setSubGoalTitle] = useState(subGoal.title)

  const [state, dispatch] = useReducer(actionsReducer, {
    actions: [...subGoal.actions].sort((a, b) => a.position - b.position),
    editingId: null,
    editingTitle: '',
    selectedAction: null,
    typeSelectorOpen: false
  })

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update local state when subGoal prop changes
  useState(() => {
    setSubGoalTitle(subGoal.title)
    dispatch({
      type: 'SET_ACTIONS',
      payload: [...subGoal.actions].sort((a, b) => a.position - b.position)
    })
  })

  // Action Title Handlers
  const handleTitleEdit = useCallback((actionId: string, currentTitle: string) => {
    dispatch({ type: 'START_EDIT', payload: { id: actionId, title: currentTitle } })
  }, [])

  const handleTitleChange = useCallback((title: string) => {
    dispatch({ type: 'UPDATE_EDIT_TITLE', payload: title })
  }, [])

  const handleTitleSave = useCallback(async (actionId: string) => {
    if (state.editingTitle.trim() === '') return

    const trimmedTitle = state.editingTitle.trim()

    // Optimistic update
    dispatch({
      type: 'UPDATE_ACTION',
      payload: { id: actionId, updates: { title: trimmedTitle } }
    })
    dispatch({ type: 'CANCEL_EDIT' })

    // Background save
    try {
      const { error } = await supabase
        .from('actions')
        .update({ title: trimmedTitle })
        .eq('id', actionId)

      if (error) throw error

      // Notify parent to refresh (optional, for consistency)
      if (onEdit) onEdit()
    } catch (err) {
      console.error('Error updating action title:', err)
      alert('실천항목 제목 수정에 실패했습니다.')
      // Revert on error
      if (onEdit) onEdit()
    }
  }, [state.editingTitle, onEdit])

  const handleTitleCancel = useCallback(() => {
    dispatch({ type: 'CANCEL_EDIT' })
  }, [])

  // Action Type Handlers
  const handleTypeEdit = useCallback((action: Action) => {
    dispatch({ type: 'OPEN_TYPE_SELECTOR', payload: action })
  }, [])

  const handleTypeSave = useCallback(async (typeData: ActionTypeData) => {
    if (!state.selectedAction) return

    const actionId = state.selectedAction.id

    // Optimistic update
    dispatch({
      type: 'UPDATE_ACTION',
      payload: {
        id: actionId,
        updates: {
          type: typeData.type,
          routine_frequency: typeData.routine_frequency,
          routine_weekdays: typeData.routine_weekdays,
          routine_count_per_period: typeData.routine_count_per_period,
          mission_completion_type: typeData.mission_completion_type,
          mission_period_cycle: typeData.mission_period_cycle,
          mission_current_period_start: typeData.mission_current_period_start,
          mission_current_period_end: typeData.mission_current_period_end,
          ai_suggestion: typeData.ai_suggestion
        }
      }
    })
    dispatch({ type: 'CLOSE_TYPE_SELECTOR' })

    // Background save
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
          ai_suggestion: typeData.ai_suggestion ? JSON.stringify(typeData.ai_suggestion) : null
        })
        .eq('id', actionId)

      if (error) throw error

      if (onEdit) onEdit()
    } catch (err) {
      console.error('Error updating action type:', err)
      alert('타입 수정에 실패했습니다.')
      if (onEdit) onEdit()
    }
  }, [state.selectedAction, onEdit])

  // Action Delete Handler
  const handleActionDelete = useCallback(async (actionId: string) => {
    if (!confirm('이 실천항목을 삭제하시겠습니까?')) return

    // Optimistic update
    dispatch({ type: 'DELETE_ACTION', payload: actionId })

    // Background delete
    try {
      const { error } = await supabase
        .from('actions')
        .delete()
        .eq('id', actionId)

      if (error) throw error

      // Reorder remaining actions
      const remainingActions = state.actions
        .filter(a => a.id !== actionId)
        .sort((a, b) => a.position - b.position)

      await reorderPositions(remainingActions)

      if (onEdit) onEdit()
    } catch (err) {
      console.error('Error deleting action:', err)
      alert('실천항목 삭제에 실패했습니다.')
      if (onEdit) onEdit()
    }
  }, [state.actions, onEdit])

  // Action Add Handler
  const handleActionAdd = useCallback(async () => {
    if (state.actions.length >= 8) {
      alert('실천항목은 최대 8개까지 추가할 수 있습니다.')
      return
    }

    const newPosition = state.actions.length > 0
      ? Math.max(...state.actions.map(a => a.position)) + 1
      : 1
    const newTitle = '새 실천항목'

    try {
      const { data, error } = await supabase
        .from('actions')
        .insert({
          sub_goal_id: subGoal.id,
          title: newTitle,
          position: newPosition,
          type: 'routine'
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      dispatch({ type: 'ADD_ACTION', payload: data })

      // Start editing immediately
      setTimeout(() => {
        handleTitleEdit(data.id, newTitle)
      }, 50)

      if (onEdit) onEdit()
    } catch (err) {
      console.error('Error adding action:', err)
      alert('실천항목 추가에 실패했습니다.')
    }
  }, [state.actions, subGoal.id, onEdit, handleTitleEdit])

  // Drag and Drop Handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = state.actions.findIndex((a) => a.id === active.id)
    const newIndex = state.actions.findIndex((a) => a.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedActions = arrayMove(state.actions, oldIndex, newIndex)

      // Optimistic update
      dispatch({ type: 'REORDER_ACTIONS', payload: reorderedActions })

      // Background save
      await reorderPositions(reorderedActions)
    }
  }, [state.actions])

  // Reorder positions helper
  const reorderPositions = async (actionsToReorder: Action[]) => {
    try {
      const updates = actionsToReorder.map((action, idx) =>
        supabase
          .from('actions')
          .update({ position: idx + 1 })
          .eq('id', action.id)
      )

      await Promise.all(updates)

      if (onEdit) onEdit()
    } catch (err) {
      console.error('Error reordering positions:', err)
      alert('순서 재정렬에 실패했습니다.')
    }
  }

  // Sub-goal Title Handlers
  const handleSubGoalTitleEdit = useCallback(() => {
    setIsEditingSubGoalTitle(true)
  }, [])

  const handleSubGoalTitleSave = useCallback(async () => {
    if (subGoalTitle.trim() === '') {
      alert('세부목표 제목을 입력해주세요.')
      return
    }

    const trimmedTitle = subGoalTitle.trim()

    // Optimistic update
    setIsEditingSubGoalTitle(false)

    // Background save
    try {
      const { error } = await supabase
        .from('sub_goals')
        .update({ title: trimmedTitle })
        .eq('id', subGoal.id)

      if (error) throw error

      if (onEdit) onEdit()
    } catch (err) {
      console.error('Error saving sub-goal:', err)
      alert('세부목표 제목 저장에 실패했습니다.')
      // Revert on error
      setSubGoalTitle(subGoal.title)
      if (onEdit) onEdit()
    }
  }, [subGoalTitle, subGoal.id, subGoal.title, onEdit])

  const handleSubGoalTitleCancel = useCallback(() => {
    setSubGoalTitle(subGoal.title)
    setIsEditingSubGoalTitle(false)
  }, [subGoal.title])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>세부목표 수정</DialogTitle>
            <DialogDescription>
              세부목표와 실천항목을 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sub-goal Title */}
            <div className="space-y-2">
              <Label>세부목표</Label>
              {isEditingSubGoalTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={subGoalTitle}
                    onChange={(e) => setSubGoalTitle(e.target.value)}
                    placeholder="세부목표 제목을 입력하세요"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSubGoalTitleSave()
                      } else if (e.key === 'Escape') {
                        handleSubGoalTitleCancel()
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleSubGoalTitleSave}
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleSubGoalTitleCancel}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer group"
                  onClick={handleSubGoalTitleEdit}
                >
                  <span className="flex-1">{subGoalTitle}</span>
                  <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {/* Actions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>실천 항목 ({state.actions.length}/8)</Label>
                {state.actions.length < 8 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleActionAdd}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                )}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={state.actions.map(a => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {state.actions.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded">
                        실천 항목이 없습니다. 추가 버튼을 클릭하여 항목을 추가하세요.
                      </div>
                    ) : (
                      state.actions.map((action, idx) => (
                        <ActionListItem
                          key={action.id}
                          action={action}
                          index={idx}
                          isEditing={state.editingId === action.id}
                          editingTitle={state.editingTitle}
                          isDraggable={true}
                          onTitleEdit={handleTitleEdit}
                          onTitleSave={handleTitleSave}
                          onTitleCancel={handleTitleCancel}
                          onTitleChange={handleTitleChange}
                          onTypeEdit={handleTypeEdit}
                          onDelete={handleActionDelete}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Type Selector */}
      {state.selectedAction && (
        <ActionTypeSelector
          open={state.typeSelectorOpen}
          onOpenChange={(open) => {
            if (!open) dispatch({ type: 'CLOSE_TYPE_SELECTOR' })
          }}
          actionTitle={state.selectedAction.title}
          initialData={{
            type: state.selectedAction.type,
            routine_frequency: state.selectedAction.routine_frequency,
            routine_weekdays: state.selectedAction.routine_weekdays,
            routine_count_per_period: state.selectedAction.routine_count_per_period,
            mission_completion_type: state.selectedAction.mission_completion_type,
            mission_period_cycle: state.selectedAction.mission_period_cycle,
            mission_current_period_start: state.selectedAction.mission_current_period_start,
            mission_current_period_end: state.selectedAction.mission_current_period_end,
            ai_suggestion: state.selectedAction.ai_suggestion
              ? (typeof state.selectedAction.ai_suggestion === 'string'
                  ? JSON.parse(state.selectedAction.ai_suggestion)
                  : state.selectedAction.ai_suggestion)
              : undefined
          }}
          onSave={handleTypeSave}
        />
      )}
    </>
  )
}
