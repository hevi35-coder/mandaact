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

interface SubGoalEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subGoal: SubGoal & { actions: Action[] }
  onSave: () => void
}

export default function SubGoalEditModal({ open, onOpenChange, subGoal, onSave }: SubGoalEditModalProps) {
  const [subGoalTitle, setSubGoalTitle] = useState(subGoal.title)
  const [actions, setActions] = useState<Action[]>(subGoal.actions)
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [editingActionTitle, setEditingActionTitle] = useState('')
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setSubGoalTitle(subGoal.title)
    setActions(subGoal.actions)
  }, [subGoal])

  const handleActionTitleEdit = (actionId: string, currentTitle: string) => {
    setEditingActionId(actionId)
    setEditingActionTitle(currentTitle)
  }

  const handleActionTitleSave = async (actionId: string) => {
    if (editingActionTitle.trim() === '') return

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

  const handleTypeEdit = (action: Action) => {
    setSelectedAction(action)
    setTypeSelectorOpen(true)
  }

  const handleTypeSave = async (typeData: ActionTypeData) => {
    if (!selectedAction) return

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
        .eq('id', selectedAction.id)

      if (error) throw error

      // Update local state
      setActions(actions.map(a =>
        a.id === selectedAction.id ? {
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
    if (actions.length >= 8) {
      alert('실천항목은 최대 8개까지 추가할 수 있습니다.')
      return
    }

    const newActionTitle = `새 실천항목 ${actions.length + 1}`
    const newPosition = actions.length + 1

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

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('sub_goals')
        .update({ title: subGoalTitle.trim() })
        .eq('id', subGoal.id)

      if (error) throw error

      onSave()
      onOpenChange(false)
    } catch (err) {
      console.error('Error saving sub-goal:', err)
      alert('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>세부목표 편집</DialogTitle>
            <DialogDescription>
              세부목표 제목과 실천항목을 수정할 수 있습니다.
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
                <Label>실천 항목 ({actions.length}/8)</Label>
                {actions.length < 8 && (
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
                {actions.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded">
                    실천 항목이 없습니다. 추가 버튼을 클릭하여 항목을 추가하세요.
                  </div>
                ) : (
                  actions.map((action, idx) => (
                    <div
                      key={action.id}
                      className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {idx + 1}.
                      </span>

                      {editingActionId === action.id ? (
                        // Editing mode
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingActionTitle}
                            onChange={(e) => setEditingActionTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleActionTitleSave(action.id)
                              } else if (e.key === 'Escape') {
                                handleActionTitleCancel()
                              }
                            }}
                            autoFocus
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleActionTitleSave(action.id)}
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
                            onClick={() => handleActionTitleEdit(action.id, action.title)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleActionDelete(action.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
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
            routine_weekdays: selectedAction.routine_weekdays,
            routine_count_per_period: selectedAction.routine_count_per_period,
            mission_completion_type: selectedAction.mission_completion_type,
            mission_period_cycle: selectedAction.mission_period_cycle,
            mission_current_period_start: selectedAction.mission_current_period_start,
            mission_current_period_end: selectedAction.mission_current_period_end,
            ai_suggestion: selectedAction.ai_suggestion
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
