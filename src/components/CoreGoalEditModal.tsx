import { useState, useEffect, useCallback } from 'react'
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

  // Inline editing states (for both create and edit mode)
  const [isEditingTitle, setIsEditingTitle] = useState(mode === 'create' && !hideTitle)
  const [isEditingCenterGoal, setIsEditingCenterGoal] = useState(mode === 'create')
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [isSavingCenterGoal, setIsSavingCenterGoal] = useState(false)

  useEffect(() => {
    if (mode === 'edit' && mandalart) {
      setTitle(mandalart.title)
      setCenterGoal(mandalart.center_goal)
      setIsEditingTitle(false)
      setIsEditingCenterGoal(false)
    } else {
      setTitle(initialTitle)
      setCenterGoal(initialCenterGoal)
      setIsEditingTitle(!hideTitle)
      setIsEditingCenterGoal(true)
    }
  }, [mode, mandalart, initialTitle, initialCenterGoal, hideTitle, open])

  // Inline editing handlers
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
    if (mode === 'edit' && mandalart) {
      setCenterGoal(mandalart.center_goal)
    } else {
      setCenterGoal(initialCenterGoal)
    }
    setIsEditingCenterGoal(false)
  }, [mode, mandalart, initialCenterGoal])

  // Handle modal close - auto-save for create mode
  const handleModalClose = (open: boolean) => {
    if (!open && mode === 'create') {
      // Auto-save when closing in create mode
      const validTitle = hideTitle || title.trim() !== ''
      const validCenterGoal = centerGoal.trim() !== ''

      if (validTitle && validCenterGoal && onCreate) {
        onCreate({
          title: title.trim(),
          centerGoal: centerGoal.trim()
        })
      }
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
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
          {!hideTitle && (
            <>{/* Inline editing for title (both modes) */}
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
                          mode === 'edit' ? handleTitleSave() : setIsEditingTitle(false)
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
                      onClick={mode === 'edit' ? handleTitleSave : () => setIsEditingTitle(false)}
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
                      <X className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer group"
                    onClick={handleTitleEdit}
                  >
                    <span className="flex-1">{title || '(만다라트 제목을 입력하세요)'}</span>
                    <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  만다라트를 구분할 짧은 이름을 입력하세요
                </p>
              </div>
            </>
          )}

          {/* Inline editing for center goal (both modes) */}
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
                      mode === 'edit' ? handleCenterGoalSave() : setIsEditingCenterGoal(false)
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
                  onClick={mode === 'edit' ? handleCenterGoalSave : () => setIsEditingCenterGoal(false)}
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
                  <X className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer group"
                onClick={handleCenterGoalEdit}
              >
                <span className="flex-1">{centerGoal || '(핵심 목표를 입력하세요)'}</span>
                <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              9x9 그리드 중앙에 표시될 목표를 입력하세요
            </p>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
