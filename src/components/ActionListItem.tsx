import { useEffect, useRef, memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Action } from '@/types'
import { getActionTypeLabel, formatTypeDetails } from '@/lib/actionTypes'
import { getTypeIcon } from '@/lib/iconUtils'
import { Pencil, Trash2, GripVertical } from 'lucide-react'

interface ActionListItemProps {
  action: Action
  index: number
  isEditing: boolean
  editingTitle: string
  isDraggable?: boolean
  onTitleEdit: (actionId: string, currentTitle: string) => void
  onTitleSave: (actionId: string) => void
  onTitleCancel: () => void
  onTitleChange: (title: string) => void
  onTypeEdit: (action: Action) => void
  onDelete: (actionId: string) => void
}

const ActionListItem = memo(({
  action,
  index,
  isEditing,
  editingTitle,
  isDraggable = true,
  onTitleEdit,
  onTitleSave,
  onTitleCancel,
  onTitleChange,
  onTypeEdit,
  onDelete
}: ActionListItemProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id, disabled: !isDraggable })

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isComposingRef.current) {
      onTitleSave(action.id)
    } else if (e.key === 'Escape') {
      onTitleCancel()
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 p-2.5 border rounded-lg transition-colors hover:bg-gray-50 ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      {/* Drag Handle */}
      {isDraggable && !isEditing && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing flex-shrink-0">
          <GripVertical className="w-3.5 h-3.5 text-gray-400" />
        </div>
      )}

      {/* Index */}
      <span className="text-sm font-medium text-muted-foreground w-6 flex-shrink-0">
        {index + 1}.
      </span>

      {isEditing ? (
        // Editing Mode
        <div className="flex-1 flex items-center gap-2">
          <Input
            ref={inputRef}
            value={editingTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { isComposingRef.current = true }}
            onCompositionEnd={() => { isComposingRef.current = false }}
            className="flex-1"
            placeholder="실천항목 제목을 입력하세요"
          />
          <Button
            size="sm"
            onClick={() => onTitleSave(action.id)}
          >
            저장
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onTitleCancel}
          >
            취소
          </Button>
        </div>
      ) : (
        // View Mode
        <>
          <div className="flex-1 min-w-0">
            <span className="text-sm break-words block">{action.title || '(제목 없음)'}</span>
          </div>

          {/* Type Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTypeEdit(action)
            }}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs border rounded hover:bg-gray-100 transition-colors flex-shrink-0 whitespace-nowrap"
            title={`${getActionTypeLabel(action.type)} - 클릭하여 편집`}
          >
            {getTypeIcon(action.type)}
            <span>{formatTypeDetails(action) || getActionTypeLabel(action.type)}</span>
          </button>

          {/* Edit Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onTitleEdit(action.id, action.title)
            }}
            className="p-1.5 h-auto flex-shrink-0"
          >
            <Pencil className="w-3 h-3" />
          </Button>

          {/* Delete Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(action.id)
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

ActionListItem.displayName = 'ActionListItem'

export default ActionListItem
