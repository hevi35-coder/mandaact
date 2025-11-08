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
import { Mandalart } from '@/types'
import { supabase } from '@/lib/supabase'

interface CoreGoalEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  mandalart?: Mandalart  // Required for edit mode
  initialTitle?: string  // For create mode
  initialCenterGoal?: string  // For create mode
  onCreate?: (data: { title: string; centerGoal: string }) => void  // For create mode
  onEdit?: () => void  // For edit mode
}

export default function CoreGoalEditModal({
  open,
  onOpenChange,
  mode,
  mandalart,
  initialTitle = '',
  initialCenterGoal = '',
  onCreate,
  onEdit
}: CoreGoalEditModalProps) {
  const [title, setTitle] = useState(mode === 'edit' && mandalart ? mandalart.title : initialTitle)
  const [centerGoal, setCenterGoal] = useState(mode === 'edit' && mandalart ? mandalart.center_goal : initialCenterGoal)
  const [isSaving, setIsSaving] = useState(false)

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
    if (title.trim() === '' || centerGoal.trim() === '') {
      alert('만다라트 제목과 핵심목표를 모두 입력해주세요.')
      return
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
      alert('만다라트 정보가 없습니다.')
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
      alert('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? '만다라트 정보 입력' : '만다라트 정보 수정'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? '만다라트 제목과 핵심목표를 입력하세요.'
              : '만다라트 제목과 핵심목표를 수정할 수 있습니다.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mandalart Title */}
          <div className="space-y-2">
            <Label htmlFor="mandalart-title">만다라트 제목</Label>
            <Input
              id="mandalart-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="만다라트 제목을 입력하세요"
            />
          </div>

          {/* Core Goal */}
          <div className="space-y-2">
            <Label htmlFor="core-goal">핵심 목표</Label>
            <Input
              id="core-goal"
              value={centerGoal}
              onChange={(e) => setCenterGoal(e.target.value)}
              placeholder="핵심 목표를 입력하세요"
            />
            <p className="text-xs text-muted-foreground">
              💡 핵심 목표는 만다라트의 중심이 되는 가장 중요한 목표입니다.
            </p>
          </div>
        </div>

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
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
