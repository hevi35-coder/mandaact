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
import ActionTypeSelector, { ActionTypeData } from '@/components/ActionTypeSelector'
import { getActionTypeLabel, formatTypeDetails } from '@/lib/actionTypes'
import { getTypeIcon } from '@/lib/iconUtils'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { VALIDATION_MESSAGES } from '@/lib/notificationMessages'
import { showWarning } from '@/lib/notificationUtils'

// Simplified action for create mode (no DB operations)
interface LocalAction {
  tempId: string
  title: string
  type: 'routine' | 'mission' | 'reference'
  routine_frequency?: 'daily' | 'weekly' | 'monthly'
  mission_completion_type?: 'once' | 'periodic'
}

interface SubGoalCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  position: number  // 1-8
  initialTitle?: string
  initialActions?: Array<{ title: string; type?: 'routine' | 'mission' | 'reference' }>
  onCreate: (data: {
    position: number
    title: string
    actions: Array<{ title: string; type?: 'routine' | 'mission' | 'reference' }>
  }) => void
}

export default function SubGoalCreateModal({
  open,
  onOpenChange,
  position,
  initialTitle = '',
  initialActions = [],
  onCreate
}: SubGoalCreateModalProps) {
  const [subGoalTitle, setSubGoalTitle] = useState(initialTitle)
  const [localActions, setLocalActions] = useState<LocalAction[]>(
    initialActions.map((a, idx) => ({
      tempId: `temp-${idx}`,
      title: a.title,
      type: a.type || 'routine'
    }))
  )
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [editingActionTitle, setEditingActionTitle] = useState('')
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<LocalAction | null>(null)

  useEffect(() => {
    setSubGoalTitle(initialTitle)
    setLocalActions(
      initialActions.map((a, idx) => ({
        tempId: `temp-${idx}`,
        title: a.title,
        type: a.type || 'routine'
      }))
    )
  }, [initialTitle, initialActions])

  const handleActionTitleEdit = (actionId: string, currentTitle: string) => {
    setEditingActionId(actionId)
    setEditingActionTitle(currentTitle)
  }

  const handleActionTitleSave = (actionId: string) => {
    if (editingActionTitle.trim() === '') return

    setLocalActions(localActions.map(a =>
      a.tempId === actionId ? { ...a, title: editingActionTitle.trim() } : a
    ))
    setEditingActionId(null)
    setEditingActionTitle('')
  }

  const handleActionTitleCancel = () => {
    setEditingActionId(null)
    setEditingActionTitle('')
  }

  const handleTypeEdit = (action: LocalAction) => {
    setSelectedAction(action)
    setTypeSelectorOpen(true)
  }

  const handleTypeSave = (typeData: ActionTypeData) => {
    if (!selectedAction) return

    setLocalActions(localActions.map(a =>
      a.tempId === selectedAction.tempId ? {
        ...a,
        type: typeData.type,
        routine_frequency: typeData.routine_frequency,
        mission_completion_type: typeData.mission_completion_type
      } : a
    ))
    setTypeSelectorOpen(false)
    setSelectedAction(null)
  }

  const handleActionDelete = (actionId: string) => {
    if (!confirm('실천항목을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) return
    setLocalActions(localActions.filter(a => a.tempId !== actionId))
  }

  const handleActionAdd = () => {
    if (localActions.length >= 8) {
      showWarning(VALIDATION_MESSAGES.maxActionsReached())
      return
    }

    const newTempId = `temp-${Date.now()}`
    const newActionTitle = '새 실천항목'
    const newAction: LocalAction = {
      tempId: newTempId,
      title: newActionTitle,
      type: 'routine'
    }

    setLocalActions([...localActions, newAction])

    // Immediately enter edit mode
    setTimeout(() => {
      setEditingActionId(newTempId)
      setEditingActionTitle(newActionTitle)
    }, 50)
  }

  const handleSave = () => {
    if (subGoalTitle.trim() === '') {
      showWarning(VALIDATION_MESSAGES.emptySubGoalTitle())
      return
    }

    onCreate({
      position,
      title: subGoalTitle.trim(),
      actions: localActions.map(a => ({
        title: a.title,
        type: a.type
      }))
    })
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle>세부목표 입력</DialogTitle>
            <DialogDescription>
              세부목표 제목과 실천항목을 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Sub-goal Title */}
            <div className="space-y-2">
              <Label htmlFor="subgoal-title">세부목표</Label>
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
                <Label>실천 항목 ({localActions.length}/8)</Label>
                {localActions.length < 8 && (
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
                {localActions.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded">
                    실천 항목이 없습니다. 추가 버튼을 클릭하여 항목을 추가하세요.
                  </div>
                ) : (
                  localActions.map((action, idx) => {
                    const isEditing = editingActionId === action.tempId

                    return (
                      <div
                        key={action.tempId}
                        className="flex items-center gap-1.5 p-2.5 border rounded-lg transition-colors hover:bg-gray-50"
                      >
                        <span className="text-sm font-medium text-muted-foreground w-6 flex-shrink-0">
                          {idx + 1}.
                        </span>

                        {isEditing ? (
                          // Editing mode
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editingActionTitle}
                              onChange={(e) => setEditingActionTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleActionTitleSave(action.tempId)
                                } else if (e.key === 'Escape') {
                                  handleActionTitleCancel()
                                }
                              }}
                              autoFocus
                              className="flex-1"
                              placeholder="실천항목 제목을 입력하세요"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleActionTitleSave(action.tempId)}
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
                            <div className="flex-1 min-w-0">
                              <span className="text-sm break-words block">{action.title || '(제목 없음)'}</span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeEdit(action)
                              }}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs border rounded hover:bg-gray-100 transition-colors flex-shrink-0 whitespace-nowrap"
                              title={`${getActionTypeLabel(action.type)} - 클릭하여 편집`}
                            >
                              {getTypeIcon(action.type)}
                              <span>{formatTypeDetails(action) || getActionTypeLabel(action.type)}</span>
                            </button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleActionTitleEdit(action.tempId, action.title)
                              }}
                              className="p-1.5 h-auto flex-shrink-0"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleActionDelete(action.tempId)
                              }}
                              className="p-1.5 h-auto flex-shrink-0"
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
            >
              닫기
            </Button>
            <Button
              type="button"
              onClick={handleSave}
            >
              저장
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
            mission_completion_type: selectedAction.mission_completion_type,
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
