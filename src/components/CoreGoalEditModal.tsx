import { useState, useEffect, useCallback } from 'react'
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
import { Mandalart } from '@/types'
import { supabase } from '@/lib/supabase'
import { Info, Pencil, Check, X, Loader2 } from 'lucide-react'
import { VALIDATION_MESSAGES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/notificationMessages'
import { showWarning, showError, showSuccess } from '@/lib/notificationUtils'

interface CoreGoalEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  mandalart?: Mandalart  // Required for edit mode
  initialTitle?: string  // For create mode
  initialCenterGoal?: string  // For create mode
  onCreate?: (data: { title: string; centerGoal: string }) => void  // For create mode
  onEdit?: () => void  // For edit mode
  hideTitle?: boolean  // Hide title field in create mode (when title is managed externally)
}

export default function CoreGoalEditModal({
  open,
  onOpenChange,
  mode,
  mandalart,
  initialTitle = '',
  initialCenterGoal = '',
  onCreate,
  onEdit,
  hideTitle = false
}: CoreGoalEditModalProps) {
  const [title, setTitle] = useState(mode === 'edit' && mandalart ? mandalart.title : initialTitle)
  const [centerGoal, setCenterGoal] = useState(mode === 'edit' && mandalart ? mandalart.center_goal : initialCenterGoal)
  const [isSaving, setIsSaving] = useState(false)

  // Inline editing states for edit mode
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingCenterGoal, setIsEditingCenterGoal] = useState(false)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [isSavingCenterGoal, setIsSavingCenterGoal] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && mandalart) {
      setTitle(mandalart.title)
      setCenterGoal(mandalart.center_goal)
    } else {
      setTitle(initialTitle)
      setCenterGoal(initialCenterGoal)
    }
  }, [mode, mandalart, initialTitle, initialCenterGoal])

  const handleSave = async () => {
    // Validation based on hideTitle
    if (mode === 'create' && hideTitle) {
      // Only validate center goal when title is hidden
      if (centerGoal.trim() === '') {
        showWarning(VALIDATION_MESSAGES.emptyCenterGoal())
        return
      }
    } else {
      // Validate both when title is shown
      if (title.trim() === '' || centerGoal.trim() === '') {
        showWarning(VALIDATION_MESSAGES.emptyBothFields())
        return
      }
    }

    if (mode === 'create') {
      // Create mode: pass data to parent without DB operation
      if (onCreate) {
        onCreate({
          title: title.trim(),
          centerGoal: centerGoal.trim()
        })
      }
      onOpenChange(false)
      return
    }

    // Edit mode: update DB
    if (!mandalart) {
      showError(VALIDATION_MESSAGES.noData())
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('mandalarts')
        .update({
          title: title.trim(),
          center_goal: centerGoal.trim()
        })
        .eq('id', mandalart.id)

      if (error) throw error

      if (onEdit) onEdit()
      onOpenChange(false)
    } catch (err) {
      console.error('Error saving mandalart:', err)
      showError(ERROR_MESSAGES.saveFailed())
    } finally {
      setIsSaving(false)
    }
  }

  // Inline editing handlers for edit mode
  const handleTitleEdit = useCallback(() => {
    setIsEditingTitle(true)
  }, [])

  const handleTitleSave = useCallback(async () => {
    if (title.trim() === '') {
      showWarning(VALIDATION_MESSAGES.emptyTitle())
      return
    }

    if (!mandalart) return

    const trimmedTitle = title.trim()

    setIsSavingTitle(true)

    // Background save
    try {
      const { error } = await supabase
        .from('mandalarts')
        .update({ title: trimmedTitle })
        .eq('id', mandalart.id)

      if (error) throw error

      setIsEditingTitle(false)
      if (onEdit) onEdit()

      // Show success feedback
      showSuccess(SUCCESS_MESSAGES.updated())
    } catch (err) {
      console.error('Error saving title:', err)
      showError(ERROR_MESSAGES.titleSaveFailed())
      // Revert on error
      setTitle(mandalart.title)
      if (onEdit) onEdit()
    } finally {
      setIsSavingTitle(false)
    }
  }, [title, mandalart, onEdit])

  const handleTitleCancel = useCallback(() => {
    if (mandalart) {
      setTitle(mandalart.title)
    }
    setIsEditingTitle(false)
  }, [mandalart])

  const handleCenterGoalEdit = useCallback(() => {
    setIsEditingCenterGoal(true)
  }, [])

  const handleCenterGoalSave = useCallback(async () => {
    if (centerGoal.trim() === '') {
      showWarning(VALIDATION_MESSAGES.emptyCenterGoal())
      return
    }

    if (!mandalart) return

    const trimmedCenterGoal = centerGoal.trim()

    setIsSavingCenterGoal(true)

    // Background save
    try {
      const { error} = await supabase
        .from('mandalarts')
        .update({ center_goal: trimmedCenterGoal })
        .eq('id', mandalart.id)

      if (error) throw error

      setIsEditingCenterGoal(false)
      if (onEdit) onEdit()

      // Show success feedback
      showSuccess(SUCCESS_MESSAGES.updated())
    } catch (err) {
      console.error('Error saving center goal:', err)
      showError(ERROR_MESSAGES.centerGoalSaveFailed())
      // Revert on error
      setCenterGoal(mandalart.center_goal)
      if (onEdit) onEdit()
    } finally {
      setIsSavingCenterGoal(false)
    }
  }, [centerGoal, mandalart, onEdit])

  const handleCenterGoalCancel = useCallback(() => {
    if (mandalart) {
      setCenterGoal(mandalart.center_goal)
    }
    setIsEditingCenterGoal(false)
  }, [mandalart])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? (hideTitle ? '핵심 목표 입력' : '만다라트 정보 입력')
              : '만다라트 정보 수정'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? (hideTitle
                  ? '9x9 그리드 중앙에 표시될 핵심 목표를 입력하세요'
                  : '만다라트 제목과 핵심목표를 입력하세요')
              : '만다라트 제목과 핵심목표를 수정할 수 있습니다'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === 'create' ? (
            <>
              {/* Create mode: Traditional Input fields */}
              {!hideTitle && (
                <div className="space-y-2">
                  <Label htmlFor="mandalart-title">만다라트 제목</Label>
                  <Input
                    id="mandalart-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 2025년 목표"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    만다라트를 구분할 짧은 이름을 입력하세요
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="core-goal">핵심 목표</Label>
                <Input
                  id="core-goal"
                  value={centerGoal}
                  onChange={(e) => setCenterGoal(e.target.value)}
                  placeholder="예: 건강하고 활력 넘치는 삶"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  9x9 그리드 중앙에 표시될 목표를 입력하세요
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Edit mode: Inline editing */}
              <div className="space-y-2">
                <Label>만다라트 제목</Label>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: 2025년 목표"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTitleSave()
                        } else if (e.key === 'Escape') {
                          handleTitleCancel()
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleTitleSave}
                      disabled={isSavingTitle}
                    >
                      {isSavingTitle ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleTitleCancel}
                      disabled={isSavingTitle}
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer group"
                    onClick={handleTitleEdit}
                  >
                    <span className="flex-1">{title}</span>
                    <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  만다라트를 구분할 짧은 이름을 입력하세요
                </p>
              </div>

              <div className="space-y-2">
                <Label>핵심 목표</Label>
                {isEditingCenterGoal ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={centerGoal}
                      onChange={(e) => setCenterGoal(e.target.value)}
                      placeholder="예: 건강하고 활력 넘치는 삶"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCenterGoalSave()
                        } else if (e.key === 'Escape') {
                          handleCenterGoalCancel()
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCenterGoalSave}
                      disabled={isSavingCenterGoal}
                    >
                      {isSavingCenterGoal ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCenterGoalCancel}
                      disabled={isSavingCenterGoal}
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer group"
                    onClick={handleCenterGoalEdit}
                  >
                    <span className="flex-1">{centerGoal}</span>
                    <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  9x9 그리드 중앙에 표시될 목표를 입력하세요
                </p>
              </div>
            </>
          )}
        </div>

        {mode === 'create' ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
