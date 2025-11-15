# Modal UI Guidelines

## Overview
This document establishes comprehensive UI policies and guidelines for all modal components in MandaAct, ensuring consistent user experience across the application.

---

## 1. Modal Component Architecture

### Component Types
- **Dialog**: Standard modal for forms, editing, data entry (shadcn/ui Dialog)
- **AlertDialog**: Confirmation, warnings, destructive actions (shadcn/ui AlertDialog)

### Component Structure
```tsx
<[Dialog/AlertDialog]>
  <[Dialog/AlertDialog]Content>
    <[Dialog/AlertDialog]Header>
      <[Dialog/AlertDialog]Title />
      <[Dialog/AlertDialog]Description />
    </[Dialog/AlertDialog]Header>

    <div className="space-y-4 py-4">
      {/* Main content */}
    </div>

    <[Dialog/AlertDialog]Footer>
      {/* Action buttons */}
    </[Dialog/AlertDialog]Footer>
  </[Dialog/AlertDialog]Content>
</[Dialog/AlertDialog]>
```

---

## 2. Width & Responsive Design

### Width Policy

**All modals use unified width: `max-w-md` (448px)**

This provides consistent user experience across all modal types, regardless of content complexity.

### Mobile Optimization
- **Required**: Add `mx-4` to DialogContent/AlertDialogContent for 16px horizontal margins
- **Overflow**: Use `max-h-[80vh] overflow-y-auto` for long content

```tsx
// ✅ Correct (unified width with mobile margins)
<DialogContent className="max-w-md max-h-[80vh] overflow-y-auto mx-4">

// ❌ Wrong (no mobile margins)
<DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">

// ❌ Wrong (inconsistent width)
<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
```

---

## 3. Header Components

### DialogTitle / AlertDialogTitle
- **Font**: `text-lg font-semibold` (default from shadcn)
- **Purpose**: Clear, concise modal purpose (1-4 words)
- **Examples**: "세부목표 수정", "만다라트 정보 입력", "만다라트 삭제"

### DialogDescription / AlertDialogDescription
- **Font**: `text-sm text-muted-foreground` (default from shadcn)
- **Purpose**: Brief explanation or important context
- **Punctuation**: No period at the end (Korean UI convention)
- **Alignment**:
  - **Dialog**: Left-aligned (default)
  - **AlertDialog**: Center-aligned when containing warnings (`justify-center`)

```tsx
// Dialog Description (left-aligned, no period)
<DialogDescription>
  세부목표와 실천항목을 수정할 수 있습니다
</DialogDescription>

// AlertDialog Description (center-aligned with icon)
<AlertDialogDescription className="flex items-center justify-center gap-2">
  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
  <span>경고: 이 작업은 되돌릴 수 없습니다</span>
</AlertDialogDescription>
```

---

## 4. Icon System

### Icon Library
- **Primary**: Lucide React icons only
- **Prohibited**: Emoji (❌, ⚠️, 💡, etc.) in production code

### Icon Usage

| Context | Icon | Size | Color |
|---------|------|------|-------|
| Hints/Info | `Info` | `h-3 w-3` | `text-muted-foreground` |
| Warnings | `AlertTriangle` | `h-4 w-4` | `text-destructive` |
| Success | `CheckCircle2` | `h-4 w-4` | `text-green-600` |
| Edit | `Pencil` | `w-4 h-4` | `text-gray-400` |
| Delete | `Trash2` | `w-4 h-4` | `text-red-500` |
| Add | `Plus` | `w-4 h-4` | default |

### Icon Patterns

**Hint Text** (small informational text):
```tsx
<p className="text-xs text-muted-foreground flex items-center gap-1">
  <Info className="h-3 w-3" />
  <span>비활성화를 권장합니다. 데이터는 보존되며 언제든 복구 가능합니다.</span>
</p>
```

**Warning Text** (important notices):
```tsx
<p className="flex items-center gap-2">
  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
  <span>경고: 이 작업은 되돌릴 수 없습니다</span>
</p>
```

---

## 5. Content Spacing

### Vertical Spacing Hierarchy

| Element | Spacing Class | Usage |
|---------|---------------|-------|
| Main sections | `space-y-6` | Between major content blocks |
| Subsections | `space-y-4` | Within major sections |
| Form fields | `space-y-3` | Action lists, compact sections |
| Field internals | `space-y-2` | Label + Input + hint |
| Inline elements | `gap-2` | Flex items (icons + text) |
| Tight layouts | `gap-1` / `gap-1.5` | Minimal spacing |

### Standard Layout Pattern
```tsx
<div className="space-y-6 py-4">  {/* Main container */}
  <div className="space-y-2">      {/* Form field group */}
    <Label>세부목표</Label>
    <Input />
    <p className="text-xs text-muted-foreground flex items-center gap-1">
      <Info className="h-3 w-3" />
      Hint text
    </p>
  </div>

  <div className="space-y-4">      {/* Content section */}
    <Label>실천 항목</Label>
    <div className="space-y-2">    {/* List items */}
      {/* Action items */}
    </div>
  </div>
</div>
```

---

## 6. Typography System

### Font Sizes

| Element | Class | Usage |
|---------|-------|-------|
| Title | `text-lg` | Modal titles (default from shadcn) |
| Body | `text-sm` | Labels, descriptions, item text |
| Hints | `text-xs` | Info text, help text, secondary info |

### Text Colors

| Semantic | Class | Usage |
|----------|-------|-------|
| Primary | default | Main content, titles |
| Secondary | `text-muted-foreground` | Hints, descriptions, placeholders |
| Success | `text-green-600` | Confirmation, success indicators |
| Destructive | `text-destructive` / `text-red-500` | Warnings, errors, delete actions |

---

## 7. Button System

### Button Order & Emphasis

**Dialog Footer (left-to-right priority):**
1. Cancel/Close (outline)
2. Primary action (default/filled)

**AlertDialog Footer (choice scenarios):**
1. Secondary action (outline)
2. Recommended action (default/filled)

**Edit Mode Modals (inline editing):**
- No footer buttons needed
- X button in top-right is sufficient for closing
- All edits are saved inline with individual save buttons

### Button Variants

| Variant | Usage | Visual |
|---------|-------|--------|
| `default` | Primary/recommended actions | Black filled |
| `outline` | Secondary/cancel actions | Gray border |
| `destructive` | Final confirmation of delete | Red filled |
| `ghost` | Inline editing actions | Transparent |

### Examples

**Dialog Footer (Standard)**:
```tsx
<DialogFooter>
  <Button variant="outline" onClick={onClose}>
    취소
  </Button>
  <Button onClick={onSave}>
    저장
  </Button>
</DialogFooter>
```

**AlertDialog Footer (Choice Step)**:
```tsx
<AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
  <Button variant="outline" onClick={onDelete}>
    영구 삭제
  </Button>
  <Button onClick={onDeactivate}>
    비활성화 (권장)
  </Button>
</AlertDialogFooter>
```

**AlertDialog Footer (Confirmation Step)**:
```tsx
<AlertDialogFooter>
  <Button variant="outline" onClick={onBack}>
    뒤로
  </Button>
  <Button variant="destructive" onClick={onConfirm}>
    영구 삭제 확정
  </Button>
</AlertDialogFooter>
```

---

## 8. Interactive Elements

### Close Button (X)
- **Location**: Top-right corner (`absolute right-4 top-4`)
- **Icon**: `<X className="h-4 w-4" />`
- **Implemented in**:
  - Dialog: Default in `ui/dialog.tsx` (line 45-48)
  - AlertDialog: Added in `ui/alert-dialog.tsx` (line 44-47)

### Inline Editing Pattern

**View Mode**:
```tsx
<div
  className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-50 cursor-pointer group"
  onClick={onEdit}
>
  <span className="flex-1">{value}</span>
  <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
</div>
```

**Edit Mode**:
```tsx
<div className="flex items-center gap-2">
  <Input
    value={editValue}
    onChange={onChange}
    onKeyDown={(e) => {
      if (e.key === 'Enter') onSave()
      if (e.key === 'Escape') onCancel()
    }}
    autoFocus
  />
  <Button size="sm" variant="ghost" onClick={onSave}>
    <Check className="w-4 h-4 text-green-600" />
  </Button>
  <Button size="sm" variant="ghost" onClick={onCancel}>
    <X className="w-4 h-4 text-red-600" />
  </Button>
</div>
```

### List Items
- **Border**: `border rounded-lg` or `rounded-md`
- **Hover**: `hover:bg-gray-50`
- **Padding**: `p-2` (compact) or `p-2.5` (standard)
- **Transition**: `transition-colors` for smooth hover effects

### Text Wrapping Policy
- **Default**: Use `break-words` for titles and text content to allow natural wrapping
- **Avoid**: `truncate` class (forces single-line with ellipsis) except for very constrained spaces
- **Multi-line Support**: Container should use `min-w-0` to allow flex items to shrink properly

```tsx
// ✅ Correct (allows wrapping)
<div className="flex-1 min-w-0">
  <span className="text-sm break-words block">{title}</span>
</div>

// ❌ Wrong (forces single line)
<div className="flex-1 min-w-0">
  <span className="text-sm truncate block">{title}</span>
</div>
```

---

## 9. Form Components

### Label Component
- **Always use** `<Label>` from shadcn/ui
- **Never** use raw text or styled divs for field labels
- **Font**: `text-sm font-medium` (default from shadcn)

### Input Fields
```tsx
<div className="space-y-2">
  <Label htmlFor="field-id">필드명</Label>
  <Input
    id="field-id"
    value={value}
    onChange={onChange}
    placeholder="입력 예시"
  />
  <p className="text-xs text-muted-foreground flex items-center gap-1">
    <Info className="h-3 w-3" />
    도움말 텍스트
  </p>
</div>
```

### Validation & Errors
- Use `showWarning()`, `showError()`, `showSuccess()` from `notificationUtils.tsx`
- Import messages from `notificationMessages.ts`
- Never use raw `toast()` calls or hardcoded strings

---

## 10. Color Usage

### Red Color Policy
- **Limited to**: Icon-only emphasis
- **Prohibited**: Large backgrounds, full-width highlights, button fills (except final destructive confirmation)
- **Allowed**:
  - `text-destructive` or `text-red-500` on warning icons
  - `text-red-600` on cancel (X) action icons
  - `variant="destructive"` ONLY on final delete confirmation buttons

### Info/Help Styling
- **Background**: Minimal or none
- **Icon**: `Info` with `text-muted-foreground`
- **Text**: `text-xs text-muted-foreground`
- **Layout**: `flex items-start gap-2` for multi-line text

```tsx
// ✅ Correct (minimal, icon-only color)
<p className="text-xs text-muted-foreground flex items-start gap-2">
  <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
  <span>정보 텍스트</span>
</p>

// ❌ Wrong (excessive red background)
<div className="bg-red-100 border-red-500 p-3 rounded">
  <p className="text-red-700">경고 메시지</p>
</div>
```

---

## 11. Data Display Patterns

### Lists with Counters
```tsx
<Label>실천 항목 ({items.length}/8)</Label>
```

### Empty States
```tsx
<div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded">
  항목이 없습니다. 추가 버튼을 클릭하여 항목을 추가하세요.
</div>
```

### Data Lists
```tsx
<div className="space-y-2">
  <Label>삭제되는 데이터</Label>
  <ul className="text-sm space-y-1 text-muted-foreground">
    <li className="flex items-start gap-2">
      <span>•</span>
      <span>{count}회의 체크 기록</span>
    </li>
    <li className="flex items-start gap-2">
      <span>•</span>
      <span>{count}개의 세부목표</span>
    </li>
  </ul>
</div>
```

---

## 12. Loading & Async States

### Loading Buttons
```tsx
<Button disabled={isSaving}>
  {isSaving ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      저장 중...
    </>
  ) : (
    '저장'
  )}
</Button>
```

### Inline Loading Icons
```tsx
{isSaving ? (
  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
) : (
  <Check className="w-4 h-4 text-green-600" />
)}
```

---

## 13. Accessibility

### Required Attributes
- `id` and `htmlFor` on Label/Input pairs
- `<span className="sr-only">` for icon-only buttons
- `autoFocus` on primary input in edit mode
- `aria-label` on icon buttons without visible text

### Keyboard Support
- Enter: Confirm/save action
- Escape: Cancel/close action
- Tab navigation through form fields

```tsx
<Input
  onKeyDown={(e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }}
  autoFocus
/>
```

---

## 14. Existing Modal Inventory

| Modal | Type | Width | Purpose |
|-------|------|-------|---------|
| CoreGoalEditModal | Dialog | `max-w-md mx-4` | Edit mandalart title & center goal |
| SubGoalEditModal | Dialog | `max-w-md mx-4` | Edit sub-goal & action list |
| SubGoalCreateModal | Dialog | `max-w-md mx-4` | Create new sub-goal with actions |
| MandalartDetailPage (Delete) | AlertDialog | `max-w-md mx-4` | Delete/deactivate mandalart |

**Note**: All modals use unified `max-w-md` width for consistent UX.

---

## 15. Notification Integration

### Helper Functions
- `showSuccess(message)` - Green CheckCircle2 icon
- `showError(message)` - Red XCircle icon
- `showWarning(message)` - Yellow AlertTriangle icon
- `showInfo(message)` - Blue Info icon
- `showCelebration(message)` - Purple Sparkles icon

### Message Definitions
Import from `@/lib/notificationMessages`:
- `VALIDATION_MESSAGES` - Input validation errors
- `ERROR_MESSAGES` - Operation failures
- `SUCCESS_MESSAGES` - Successful operations
- `ACHIEVEMENT_MESSAGES` - Celebration messages

```tsx
import { VALIDATION_MESSAGES, showWarning } from '@/lib/...'

if (title.trim() === '') {
  showWarning(VALIDATION_MESSAGES.emptyTitle())
  return
}
```

---

## 16. Implementation Checklist

When creating a new modal, verify:

- [ ] Correct component type (Dialog vs AlertDialog)
- [ ] Appropriate max-width (`max-w-md` or `max-w-2xl`)
- [ ] Mobile margins (`mx-4`)
- [ ] X button in top-right (default in base components)
- [ ] Lucide icons only (no emojis)
- [ ] Label components for all form fields
- [ ] Proper spacing hierarchy (`space-y-6` → `space-y-4` → `space-y-2`)
- [ ] Text sizes (lg/sm/xs) consistent with guidelines
- [ ] Button order and variants correct
- [ ] Notification helpers used (not raw `toast()`)
- [ ] Keyboard support (Enter/Escape)
- [ ] Accessibility attributes (id, htmlFor, sr-only)
- [ ] Loading states for async operations
- [ ] Color usage follows red color policy

---

## 17. Anti-Patterns to Avoid

❌ **Never do**:
- Use emojis instead of Lucide icons
- Mix camelCase/snake_case in UI text
- Use raw `toast()` calls with hardcoded strings
- Add red backgrounds for warnings
- Put complex UI in AlertDialogDescription
- Skip Label components for form fields
- Forget mobile margins (`mx-4`)
- Use destructive button variant for recommended actions
- Hardcode validation messages

✅ **Always do**:
- Use Lucide icons consistently
- Import messages from `notificationMessages.ts`
- Use notification helper functions
- Limit red color to icon-only emphasis
- Use Label component for all form fields
- Add mobile margins to all modals
- Emphasize recommended actions (black button)
- Follow spacing hierarchy

---

## 18. Future Considerations

### Potential Improvements
1. Create reusable modal template components
2. Abstract common patterns (inline editing, list items) into shared components
3. Standardize drag-and-drop UI across modals
4. Add animation/transition guidelines
5. Document mobile-specific interactions (swipe to dismiss, etc.)
6. Establish dark mode color mappings

### Version History
- **v1.3** (2025-11-11): Edit mode modal refinements
  - Removed redundant footer "닫기" buttons in edit mode modals
  - Added punctuation policy (no period at end of descriptions)
  - Clarified button patterns for inline editing modals
  - Updated CoreGoalEditModal and SubGoalEditModal
- **v1.2** (2025-11-11): Text wrapping improvements
  - Changed `truncate` to `break-words` for action item titles
  - Added text wrapping policy to Section 8
  - Allows long titles to wrap naturally for better readability
- **v1.1** (2025-11-11): Unified modal width policy
  - Changed all modals to `max-w-md` for consistency
  - Updated SubGoalEditModal and SubGoalCreateModal
- **v1.0** (2025-11-11): Initial guidelines based on existing modal analysis
  - Established width policies
  - Icon system standardization
  - Color usage restrictions
  - Button order conventions

---

## Quick Reference

### Common Snippets

**Standard Dialog Structure**:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-md mx-4">
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
      <DialogDescription>설명</DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      {/* Content */}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={onClose}>취소</Button>
      <Button onClick={onSave}>저장</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Form Field**:
```tsx
<div className="space-y-2">
  <Label htmlFor="field">필드명</Label>
  <Input id="field" value={value} onChange={onChange} />
  <p className="text-xs text-muted-foreground flex items-center gap-1">
    <Info className="h-3 w-3" />
    힌트
  </p>
</div>
```

**Warning Section**:
```tsx
<AlertDialogDescription className="flex items-center justify-center gap-2">
  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
  <span>경고 메시지</span>
</AlertDialogDescription>
```
