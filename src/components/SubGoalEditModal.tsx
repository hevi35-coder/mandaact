import { useState, useEffect } from 'react'
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
import { getActionTypeLabel, formatTypeDetails } from '@/lib/actionTypes'
import { getTypeIcon } from '@/lib/iconUtils'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Simplified action for create mode (no DB operations)
interface LocalAction {
  tempId: string  // Temporary ID for local state management
  title: string
  type: 'routine' | 'mission' | 'reference'  // Required, defaults to 'routine'
  routine_frequency?: 'daily' | 'weekly' | 'monthly'
  mission_completion_type?: 'once' | 'periodic'
}

interface SubGoalEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  position: number  // 1-8
  subGoal?: SubGoal & { actions: Action[] }  // Required for edit mode
  initialTitle?: string  // For create mode
  initialActions?: Array<{ title: string; type?: 'routine' | 'mission' | 'reference' }>  // For create mode
  onCreate?: (data: {
    position: number
    title: string
    actions: Array<{ title: string; type?: 'routine' | 'mission' | 'reference' }>
  }) => void  // For create mode
  onEdit?: () => void  // For edit mode
}

export default function SubGoalEditModal({
  open,
  onOpenChange,
  mode,
  position,
  subGoal,
  initialTitle = '',
  initialActions = [],
  onCreate,
  onEdit
}: SubGoalEditModalProps) {
  const [subGoalTitle, setSubGoalTitle] = useState(
    mode === 'edit' && subGoal ? subGoal.title : initialTitle
  )
  const [actions, setActions] = useState<Action[]>(
    mode === 'edit' && subGoal ? subGoal.actions : []
  )
  const [localActions, setLocalActions] = useState<LocalAction[]>(
    mode === 'create'
      ? initialActions.map((a, idx) => ({
          tempId: `temp-${idx}`,
          title: a.title,
          type: a.type || 'routine'
        }))
      : []
  )
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [editingActionTitle, setEditingActionTitle] = useState('')
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | LocalAction | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && subGoal) {
      setSubGoalTitle(subGoal.title)
      setActions(subGoal.actions)
    } else {
      setSubGoalTitle(initialTitle)
      setLocalActions(
        initialActions.map((a, idx) => ({
          tempId: `temp-${idx}`,
          title: a.title,
          type: a.type || 'routine'
        }))
      )
    }
  }, [mode, subGoal, initialTitle, initialActions])

  const handleActionTitleEdit = (actionId: string, currentTitle: string) => {
    setEditingActionId(actionId)
    setEditingActionTitle(currentTitle)
  }

  const handleActionTitleSave = async (actionId: string) => {
    if (editingActionTitle.trim() === '') return

    if (mode === 'create') {
      // Create mode: update local state only
      setLocalActions(localActions.map(a =>
        a.tempId === actionId ? { ...a, title: editingActionTitle.trim() } : a
      ))
      setEditingActionId(null)
      setEditingActionTitle('')
      return
    }

    // Edit mode: update DB
    try {
      const { error } = await supabase
        .from('actions')
        .update({ title: editingActionTitle.trim() })
        .eq('id', actionId)

      if (error) throw error

      // Update local state
      setActions(actions.map(a =>
        a.id === actionId ? { ...a, title: editingActionTitle.trim() } : a
      ))
      setEditingActionId(null)
      setEditingActionTitle('')
    } catch (err) {
      console.error('Error updating action title:', err)
      alert('실천항목 제목 수정에 실패했습니다.')
    }
  }

  const handleActionTitleCancel = () => {
    setEditingActionId(null)
    setEditingActionTitle('')
  }

  const handleTypeEdit = (action: Action | LocalAction) => {
    setSelectedAction(action)
    setTypeSelectorOpen(true)
  }

  const handleTypeSave = async (typeData: ActionTypeData) => {
    if (!selectedAction) return

    if (mode === 'create') {
      // Create mode: update local state only
      const tempId = (selectedAction as LocalAction).tempId
      setLocalActions(localActions.map(a =>
        a.tempId === tempId ? {
          ...a,
          type: typeData.type,
          routine_frequency: typeData.routine_frequency,
          mission_completion_type: typeData.mission_completion_type
        } : a
      ))
      setTypeSelectorOpen(false)
      setSelectedAction(null)
      return
    }

    // Edit mode: update DB
    try {
      const actionId = (selectedAction as Action).id
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

      // Update local state
      setActions(actions.map(a =>
        a.id === actionId ? {
          ...a,
          type: typeData.type,
          routine_frequency: typeData.routine_frequency,
          routine_weekdays: typeData.routine_weekdays,
          routine_count_per_period: typeData.routine_count_per_period,
          mission_completion_type: typeData.mission_completion_type,
          mission_period_cycle: typeData.mission_period_cycle,
          mission_current_period_start: typeData.mission_current_period_start,
          mission_current_period_end: typeData.mission_current_period_end,
          ai_suggestion: typeData.ai_suggestion
        } : a
      ))
      setTypeSelectorOpen(false)
      setSelectedAction(null)
    } catch (err) {
      console.error('Error updating action type:', err)
      alert('타입 수정에 실패했습니다.')
    }
  }

  const handleActionDelete = async (actionId: string) => {
    if (!confirm('이 실천항목을 삭제하시겠습니까?')) return

    if (mode === 'create') {
      // Create mode: update local state only
      setLocalActions(localActions.filter(a => a.tempId !== actionId))
      return
    }

    // Edit mode: delete from DB
    try {
      const { error } = await supabase
        .from('actions')
        .delete()
        .eq('id', actionId)

      if (error) throw error

      // Update local state
      setActions(actions.filter(a => a.id !== actionId))
    } catch (err) {
      console.error('Error deleting action:', err)
      alert('실천항목 삭제에 실패했습니다.')
    }
  }

  const handleActionAdd = async () => {
    const currentCount = mode === 'create' ? localActions.length : actions.length

    if (currentCount >= 8) {
      alert('실천항목은 최대 8개까지 추가할 수 있습니다.')
      return
    }

    if (mode === 'create') {
      // Create mode: add to local state only
      const newAction: LocalAction = {
        tempId: `temp-${Date.now()}`,
        title: `새 실천항목 ${currentCount + 1}`,
        type: 'routine'
      }
      setLocalActions([...localActions, newAction])
      return
    }

    // Edit mode: add to DB
    if (!subGoal) return

    const newActionTitle = `새 실천항목 ${currentCount + 1}`
    const newPosition = currentCount + 1

    try {
      const { data, error } = await supabase
        .from('actions')
        .insert({
          sub_goal_id: subGoal.id,
          title: newActionTitle,
          position: newPosition,
          type: 'routine'
        })
        .select()
        .single()

      if (error) throw error

      // Update local state
      setActions([...actions, data])
    } catch (err) {
      console.error('Error adding action:', err)
      alert('실천항목 추가에 실패했습니다.')
    }
  }

  const handleSubGoalTitleSave = async () => {
    if (subGoalTitle.trim() === '') {
      alert('세부목표 제목을 입력해주세요.')
      return
    }

    if (mode === 'create') {
      // Create mode: pass data to parent without DB operation
      if (onCreate) {
        onCreate({
          position,
          title: subGoalTitle.trim(),
          actions: localActions.map(a => ({
            title: a.title,
            type: a.type
          }))
        })
      }
      onOpenChange(false)
      return
    }

    // Edit mode: update DB
    if (!subGoal) {
      alert('세부목표 정보가 없습니다.')
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('sub_goals')
        .update({ title: subGoalTitle.trim() })
        .eq('id', subGoal.id)

      if (error) throw error

      if (onEdit) onEdit()
      onOpenChange(false)
    } catch (err) {
      console.error('Error saving sub-goal:', err)
      alert('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // Helper to get current actions array based on mode
  const currentActionsArray = mode === 'create' ? localActions : actions
  const getActionId = (action: Action | LocalAction) =>
    mode === 'create' ? (action as LocalAction).tempId : (action as Action).id

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? '세부목표 입력' : '세부목표 편집'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? '세부목표 제목과 실천항목을 입력하세요.'
                : '세부목표 제목과 실천항목을 수정할 수 있습니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sub-goal Title */}
            <div className="space-y-2">
              <Label htmlFor="subgoal-title">세부목표 제목</Label>
              <Input
                id="subgoal-title"
                value={subGoalTitle}
                onChange={(e) => setSubGoalTitle(e.target.value)}
                placeholder="세부목표 제목을 입력하세요"
              />
            </div>

            {/* Actions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>실천 항목 ({currentActionsArray.length}/8)</Label>
                {currentActionsArray.length < 8 && (
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

              <div className="space-y-2">
                {currentActionsArray.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded">
                    실천 항목이 없습니다. 추가 버튼을 클릭하여 항목을 추가하세요.
                  </div>
                ) : (
                  currentActionsArray.map((action, idx) => {
                    const actionId = getActionId(action)
                    return (
                      <div
                        key={actionId}
                        className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {idx + 1}.
                        </span>

                        {editingActionId === actionId ? (
                          // Editing mode
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editingActionTitle}
                              onChange={(e) => setEditingActionTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleActionTitleSave(actionId)
                                } else if (e.key === 'Escape') {
                                  handleActionTitleCancel()
                                }
                              }}
                              autoFocus
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleActionTitleSave(actionId)}
                            >
                              저장
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleActionTitleCancel}
                            >
                              취소
                            </Button>
                          </div>
                        ) : (
                          // View mode
                          <>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-sm">{action.title}</span>
                            </div>

                            <button
                              onClick={() => handleTypeEdit(action)}
                              className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100 transition-colors"
                              title={`${getActionTypeLabel(action.type)} - 클릭하여 편집`}
                            >
                              {getTypeIcon(action.type)}
                              <span>{formatTypeDetails(action) || getActionTypeLabel(action.type)}</span>
                            </button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleActionTitleEdit(actionId, action.title)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleActionDelete(actionId)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              닫기
            </Button>
            <Button
              type="button"
              onClick={handleSubGoalTitleSave}
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Type Selector */}
      {selectedAction && (
        <ActionTypeSelector
          open={typeSelectorOpen}
          onOpenChange={setTypeSelectorOpen}
          actionTitle={selectedAction.title}
          initialData={{
            type: selectedAction.type,
            routine_frequency: selectedAction.routine_frequency,
            routine_weekdays: 'routine_weekdays' in selectedAction ? selectedAction.routine_weekdays : undefined,
            routine_count_per_period: 'routine_count_per_period' in selectedAction ? selectedAction.routine_count_per_period : undefined,
            mission_completion_type: selectedAction.mission_completion_type,
            mission_period_cycle: 'mission_period_cycle' in selectedAction ? selectedAction.mission_period_cycle : undefined,
            mission_current_period_start: 'mission_current_period_start' in selectedAction ? selectedAction.mission_current_period_start : undefined,
            mission_current_period_end: 'mission_current_period_end' in selectedAction ? selectedAction.mission_current_period_end : undefined,
            ai_suggestion: 'ai_suggestion' in selectedAction && selectedAction.ai_suggestion
              ? (typeof selectedAction.ai_suggestion === 'string'
                  ? JSON.parse(selectedAction.ai_suggestion)
                  : selectedAction.ai_suggestion)
              : undefined
          }}
          onSave={handleTypeSave}
        />
      )}
    </>
  )
}
