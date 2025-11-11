import { useState, useReducer, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubGoal, Action } from '@/types'
import ActionTypeSelector, { ActionTypeData } from '@/components/ActionTypeSelector'
import ActionListItem from '@/components/ActionListItem'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/notificationMessages'
import { showWarning, showError, showSuccess } from '@/lib/notificationUtils'
import { suggestActionType } from '@/lib/actionTypes'
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

// Local action type for create mode (with tempId and optional DB fields)
type LocalAction = Omit<Action, 'created_at' | 'updated_at'> & {
  tempId?: string
  created_at?: string
  updated_at?: string
}

interface SubGoalModalProps {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void

  // Create mode props
  position?: number  // 1-8
  initialTitle?: string
  initialActions?: Array<{ title: string; type?: 'routine' | 'mission' | 'reference' }>
  onCreate?: (data: {
    position: number
    title: string
    actions: Array<{ title: string; type?: 'routine' | 'mission' | 'reference' }>
  }) => void

  // Edit mode props
  subGoal?: SubGoal & { actions: Action[] }
  onEdit?: () => void
}

// Reducer for actions state management
type ActionsState = {
  actions: LocalAction[]
  editingId: string | null
  editingTitle: string
  selectedAction: LocalAction | null
  typeSelectorOpen: boolean
}

type ActionsAction =
  | { type: 'SET_ACTIONS'; payload: LocalAction[] }
  | { type: 'ADD_ACTION'; payload: LocalAction }
  | { type: 'UPDATE_ACTION'; payload: { id: string; updates: Partial<LocalAction> } }
  | { type: 'DELETE_ACTION'; payload: string }
  | { type: 'REORDER_ACTIONS'; payload: LocalAction[] }
  | { type: 'START_EDIT'; payload: { id: string; title: string } }
  | { type: 'UPDATE_EDIT_TITLE'; payload: string }
  | { type: 'CANCEL_EDIT' }
  | { type: 'OPEN_TYPE_SELECTOR'; payload: LocalAction }
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

export default function SubGoalModal({
  mode,
  open,
  onOpenChange,
  position,
  initialTitle = '',
  initialActions = [],
  onCreate,
  subGoal,
  onEdit
}: SubGoalModalProps) {
  const [isEditingSubGoalTitle, setIsEditingSubGoalTitle] = useState(false)
  const [subGoalTitle, setSubGoalTitle] = useState(
    mode === 'edit' && subGoal ? subGoal.title : initialTitle
  )

  // Initialize actions based on mode
  const getInitialActions = (): LocalAction[] => {
    if (mode === 'edit' && subGoal) {
      return [...subGoal.actions].sort((a, b) => a.position - b.position)
    }

    // Create mode: convert initialActions to LocalAction format
    return initialActions.map((a, idx) => {
      const aiSuggestion = suggestActionType(a.title)
      return {
        id: `temp-${Date.now()}-${idx}`,
        tempId: `temp-${Date.now()}-${idx}`,
        title: a.title,
        type: a.type || aiSuggestion.type,
        position: idx + 1,
        ai_suggestion: aiSuggestion,
        sub_goal_id: '', // Will be set when saved
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as LocalAction
    })
  }

  const [state, dispatch] = useReducer(actionsReducer, {
    actions: getInitialActions(),
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

  // Update local state when props change
  useEffect(() => {
    if (mode === 'edit' && subGoal) {
      setSubGoalTitle(subGoal.title)
      dispatch({
        type: 'SET_ACTIONS',
        payload: [...subGoal.actions].sort((a, b) => a.position - b.position)
      })
    } else {
      setSubGoalTitle(initialTitle)
      dispatch({
        type: 'SET_ACTIONS',
        payload: getInitialActions()
      })
    }
  }, [mode, subGoal, initialTitle, initialActions])

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
    const aiSuggestion = suggestActionType(trimmedTitle)

    // Optimistic update (works for both create and edit mode)
    dispatch({
      type: 'UPDATE_ACTION',
      payload: {
        id: actionId,
        updates: {
          title: trimmedTitle,
          ai_suggestion: aiSuggestion
        }
      }
    })
    dispatch({ type: 'CANCEL_EDIT' })

    // Only save to DB in edit mode
    if (mode === 'edit') {
      try {
        const { error } = await supabase
          .from('actions')
          .update({ title: trimmedTitle })
          .eq('id', actionId)

        if (error) throw error

        if (onEdit) onEdit()
        showSuccess(SUCCESS_MESSAGES.updated())
      } catch (err) {
        console.error('Error updating action title:', err)
        showError(ERROR_MESSAGES.actionUpdateFailed())
        if (onEdit) onEdit()
      }
    }
  }, [state.editingTitle, mode, onEdit])

  const handleTitleCancel = useCallback(() => {
    dispatch({ type: 'CANCEL_EDIT' })
  }, [])

  // Action Type Handlers
  const handleTypeEdit = useCallback((action: LocalAction) => {
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

    // Only save to DB in edit mode
    if (mode === 'edit') {
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
        showSuccess(SUCCESS_MESSAGES.typeUpdated())
      } catch (err) {
        console.error('Error updating action type:', err)
        showError(ERROR_MESSAGES.typeUpdateFailed())
        if (onEdit) onEdit()
      }
    }
  }, [state.selectedAction, mode, onEdit])

  // Action Delete Handler
  const handleActionDelete = useCallback(async (actionId: string) => {
    if (!confirm('실천항목을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) return

    // Optimistic update
    dispatch({ type: 'DELETE_ACTION', payload: actionId })

    // Only delete from DB in edit mode
    if (mode === 'edit') {
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
        showError(ERROR_MESSAGES.actionDeleteFailed())
        if (onEdit) onEdit()
      }
    }
  }, [state.actions, mode, onEdit])

  // Action Add Handler
  const handleActionAdd = useCallback(async () => {
    if (state.actions.length >= 8) {
      showWarning(VALIDATION_MESSAGES.maxActionsReached())
      return
    }

    const newPosition = state.actions.length > 0
      ? Math.max(...state.actions.map(a => a.position)) + 1
      : 1
    const newTitle = '새 실천항목'

    if (mode === 'edit' && subGoal) {
      // Edit mode: Create in DB immediately
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

        dispatch({ type: 'ADD_ACTION', payload: data })

        setTimeout(() => {
          handleTitleEdit(data.id, newTitle)
        }, 50)

        if (onEdit) onEdit()
      } catch (err) {
        console.error('Error adding action:', err)
        showError(ERROR_MESSAGES.actionAddFailed())
      }
    } else {
      // Create mode: Add to local state only
      const aiSuggestion = suggestActionType(newTitle)
      const tempId = `temp-${Date.now()}`
      const newAction: LocalAction = {
        id: tempId,
        tempId: tempId,
        title: newTitle,
        type: aiSuggestion.type,
        position: newPosition,
        ai_suggestion: aiSuggestion,
        sub_goal_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      dispatch({ type: 'ADD_ACTION', payload: newAction })

      setTimeout(() => {
        handleTitleEdit(tempId, newTitle)
      }, 50)
    }
  }, [state.actions, mode, subGoal, onEdit, handleTitleEdit])

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

      // Only save to DB in edit mode
      if (mode === 'edit') {
        await reorderPositions(reorderedActions)
      }
    }
  }, [state.actions, mode])

  // Reorder positions helper
  const reorderPositions = async (actionsToReorder: LocalAction[]) => {
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
      showError(ERROR_MESSAGES.reorderFailed())
    }
  }

  // Sub-goal Title Handlers
  const handleSubGoalTitleEdit = useCallback(() => {
    setIsEditingSubGoalTitle(true)
  }, [])

  const handleSubGoalTitleSave = useCallback(async () => {
    if (subGoalTitle.trim() === '') {
      showWarning(VALIDATION_MESSAGES.emptySubGoalTitle())
      return
    }

    const trimmedTitle = subGoalTitle.trim()

    // Optimistic update
    setIsEditingSubGoalTitle(false)

    // Only save to DB in edit mode
    if (mode === 'edit' && subGoal) {
      try {
        const { error } = await supabase
          .from('sub_goals')
          .update({ title: trimmedTitle })
          .eq('id', subGoal.id)

        if (error) throw error

        if (onEdit) onEdit()
        showSuccess(SUCCESS_MESSAGES.updated())
      } catch (err) {
        console.error('Error saving sub-goal:', err)
        showError(ERROR_MESSAGES.subGoalSaveFailed())
        setSubGoalTitle(subGoal.title)
        if (onEdit) onEdit()
      }
    }
  }, [subGoalTitle, mode, subGoal, onEdit])

  const handleSubGoalTitleCancel = useCallback(() => {
    if (mode === 'edit' && subGoal) {
      setSubGoalTitle(subGoal.title)
    } else {
      setSubGoalTitle(initialTitle)
    }
    setIsEditingSubGoalTitle(false)
  }, [mode, subGoal, initialTitle])

  // Final save handler for create mode
  const handleCreateSave = () => {
    if (subGoalTitle.trim() === '') {
      showWarning(VALIDATION_MESSAGES.emptySubGoalTitle())
      return
    }

    if (mode === 'create' && onCreate && position) {
      onCreate({
        position,
        title: subGoalTitle.trim(),
        actions: state.actions.map(a => ({
          title: a.title,
          type: a.type
        }))
      })
      onOpenChange(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? '세부목표 입력' : '세부목표 수정'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? '세부목표 제목과 실천항목을 입력하세요.'
                : '세부목표와 실천항목을 수정할 수 있습니다'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sub-goal Title */}
            <div className="space-y-2">
              <Label>세부목표</Label>
              {mode === 'create' || isEditingSubGoalTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={subGoalTitle}
                    onChange={(e) => setSubGoalTitle(e.target.value)}
                    placeholder="세부목표 제목을 입력하세요"
                    onKeyDown={(e) => {
                      if (mode === 'edit') {
                        if (e.key === 'Enter') {
                          handleSubGoalTitleSave()
                        } else if (e.key === 'Escape') {
                          handleSubGoalTitleCancel()
                        }
                      }
                    }}
                    autoFocus={mode === 'edit' && isEditingSubGoalTitle}
                  />
                  {mode === 'edit' && (
                    <>
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
                    </>
                  )}
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
                          action={action as Action}
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

          {/* Footer only for create mode */}
          {mode === 'create' && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                닫기
              </Button>
              <Button
                type="button"
                onClick={handleCreateSave}
              >
                저장
              </Button>
            </DialogFooter>
          )}
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
