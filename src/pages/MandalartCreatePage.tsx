import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { MandalartGridData } from '@/types'
import MandalartGrid from '@/components/MandalartGrid'
import InputMethodSelector from '@/components/InputMethodSelector'
import CoreGoalEditModal from '@/components/CoreGoalEditModal'
import SubGoalModal from '@/components/SubGoalModal'
import { suggestActionType } from '@/lib/actionTypes'
import { Plus } from 'lucide-react'
import { VALIDATION_MESSAGES, ERROR_MESSAGES } from '@/lib/notificationMessages'
import { showWarning, showError } from '@/lib/notificationUtils'

export default function MandalartCreatePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  // Input method selection
  const [inputMethod, setInputMethod] = useState<'image' | 'manual' | 'text' | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  // Mandalart data
  const [title, setTitle] = useState('')
  const [gridData, setGridData] = useState<MandalartGridData>({
    center_goal: '',
    sub_goals: []
  })

  // Modal state
  const [coreGoalModalOpen, setCoreGoalModalOpen] = useState(false)
  const [subGoalModalOpen, setSubGoalModalOpen] = useState(false)
  const [selectedSubGoalPosition, setSelectedSubGoalPosition] = useState<number | null>(null)

  // Mobile state
  const [mobileExpandedSection, setMobileExpandedSection] = useState<number | null>(null)

  // Loading
  const [isLoading, setIsLoading] = useState(false)

  // Handle input method selection
  const handleMethodSelect = (method: 'image' | 'text' | 'manual') => {
    setInputMethod(method)
  }

  // Handle image processing complete
  const handleImageProcessComplete = (data: MandalartGridData, imageUrl: string) => {
    setGridData(data)
    setUploadedImageUrl(imageUrl)
    // Auto-open modal to input title
    setTimeout(() => setCoreGoalModalOpen(true), 300)
  }

  // Handle text processing complete
  const handleTextProcessComplete = (data: MandalartGridData) => {
    setGridData(data)
    // Auto-open modal to input title
    setTimeout(() => setCoreGoalModalOpen(true), 300)
  }

  // Handle core goal click (center cell)
  const handleCoreGoalClick = () => {
    setCoreGoalModalOpen(true)
  }

  // Handle sub-goal section click (outer 8 sections)
  const handleSectionClick = (sectionPos: number) => {
    setSelectedSubGoalPosition(sectionPos)
    setSubGoalModalOpen(true)
  }

  // Handle core goal save from modal
  const handleCoreGoalSave = (data: { title: string; centerGoal: string }) => {
    setTitle(data.title)
    setGridData({
      ...gridData,
      center_goal: data.centerGoal
    })
  }

  // Handle sub-goal save from modal
  const handleSubGoalSave = (data: {
    position: number
    title: string
    actions: Array<{ title: string; type?: 'routine' | 'mission' | 'reference' }>
  }) => {
    const newSubGoals = [...gridData.sub_goals]

    // Find existing sub-goal at this position
    const existingIndex = newSubGoals.findIndex(sg => sg.position === data.position)

    const subGoalData = {
      position: data.position,
      title: data.title,
      actions: data.actions.map((a, idx) => ({
        position: idx + 1,
        title: a.title,
        type: a.type
      }))
    }

    if (existingIndex >= 0) {
      // Update existing
      newSubGoals[existingIndex] = subGoalData
    } else {
      // Add new
      newSubGoals.push(subGoalData)
    }

    setGridData({
      ...gridData,
      sub_goals: newSubGoals
    })
  }

  // Handle save to database
  const handleSave = async () => {
    if (!user) {
      showError(ERROR_MESSAGES.authRequired())
      return
    }

    if (!title.trim() || !gridData.center_goal.trim()) {
      showWarning(VALIDATION_MESSAGES.emptyBothFields())
      return
    }

    // Validate sub-goals
    const filledSubGoals = gridData.sub_goals.filter(sg => sg.title.trim())
    if (filledSubGoals.length === 0) {
      showWarning(VALIDATION_MESSAGES.minSubGoalsRequired())
      return
    }

    setIsLoading(true)

    try {
      // 1. Create mandalart
      const { data: mandalart, error: mandalartError } = await supabase
        .from('mandalarts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          center_goal: gridData.center_goal.trim(),
          input_method: inputMethod || 'manual',
          image_url: uploadedImageUrl,
        })
        .select()
        .single()

      if (mandalartError) throw mandalartError

      // 2. Create sub-goals
      const subGoalsToInsert = filledSubGoals.map(sg => ({
        mandalart_id: mandalart.id,
        position: sg.position,
        title: sg.title.trim()
      }))

      const { data: createdSubGoals, error: subGoalsError } = await supabase
        .from('sub_goals')
        .insert(subGoalsToInsert)
        .select()

      if (subGoalsError) throw subGoalsError

      // 3. Create actions
      const actionsToInsert = createdSubGoals.flatMap((sg) => {
        const originalSubGoal = gridData.sub_goals.find(
          (original) => original.position === sg.position
        )
        if (!originalSubGoal) return []

        return originalSubGoal.actions
          .filter((action) => action.title.trim())
          .map((action) => {
            // Use AI suggestion if no type is provided
            const aiSuggestion = action.type
              ? null
              : suggestActionType(action.title.trim())

            const finalType = action.type || aiSuggestion?.type || 'routine'
            const aiSuggestionStr = aiSuggestion
              ? JSON.stringify({
                  type: aiSuggestion.type,
                  confidence: aiSuggestion.confidence,
                  reason: aiSuggestion.reason
                })
              : undefined

            return {
              sub_goal_id: sg.id,
              position: action.position,
              title: action.title.trim(),
              type: finalType,
              routine_frequency: action.type === 'routine' ? 'daily' : undefined,
              mission_completion_type: action.type === 'mission' ? 'once' : undefined,
              ai_suggestion: aiSuggestionStr
            }
          })
      })

      if (actionsToInsert.length > 0) {
        const { error: actionsError } = await supabase
          .from('actions')
          .insert(actionsToInsert)

        if (actionsError) throw actionsError
      }

      // Success! Redirect to mandalart detail page
      navigate(`/mandalart/${mandalart.id}`)
    } catch (err) {
      console.error('Save error:', err)
      showError(ERROR_MESSAGES.saveFailed())
    } finally {
      setIsLoading(false)
    }
  }

  // Get initial data for modals
  const getSubGoalInitialData = () => {
    if (selectedSubGoalPosition === null) return { title: '', actions: [] }

    const existingSubGoal = gridData.sub_goals.find(
      sg => sg.position === selectedSubGoalPosition
    )

    return existingSubGoal || { title: '', actions: [] }
  }

  // Mobile handlers
  const handleMobileSectionTap = (sectionPos: number) => {
    if (mobileExpandedSection === sectionPos) {
      // Already expanded, open modal
      handleSectionClick(sectionPos)
    } else {
      // Expand section
      setMobileExpandedSection(sectionPos)
    }
  }

  const handleMobileBack = () => {
    setMobileExpandedSection(null)
  }

  // Get sub-goal by position for mobile view
  const getSubGoalByPosition = (position: number) => {
    return gridData.sub_goals.find(sg => sg.position === position)
  }

  // Render cell for mobile expanded view
  const renderMobileCell = (sectionPos: number, cellPos: number) => {
    const subGoal = getSubGoalByPosition(sectionPos)

    if (cellPos === 4) {
      // Center: Sub-goal title
      return (
        <div className="flex flex-col items-center justify-center h-full p-2 bg-blue-50 border border-blue-200">
          {subGoal?.title ? (
            <p className="text-base font-semibold line-clamp-3 text-center">
              {subGoal.title}
            </p>
          ) : null}
        </div>
      )
    } else {
      // Actions
      const actionIndex = cellPos < 4 ? cellPos : cellPos - 1
      const action = subGoal?.actions[actionIndex]

      return (
        <div className="flex flex-col items-center justify-center h-full p-2 bg-white">
          {action?.title && (
            <p className="text-sm leading-tight line-clamp-3 text-center">
              {action.title}
            </p>
          )}
        </div>
      )
    }
  }

  const sectionPositions = [1, 2, 3, 4, 0, 5, 6, 7, 8]

  return (
    <div className="py-3 md:py-6 px-4 pb-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold inline-block">만다라트 만들기</h1>
          <span className="text-muted-foreground ml-3 text-sm">새로운 목표 생성</span>
        </div>

        {/* Input Method Selector */}
        {!inputMethod && (
          <InputMethodSelector
            onMethodSelect={handleMethodSelect}
            onImageProcessComplete={handleImageProcessComplete}
            onTextProcessComplete={handleTextProcessComplete}
            disabled={isLoading}
          />
        )}


        {/* Desktop: Mandalart Grid */}
        {inputMethod && (
          <Card className="w-full hidden md:block">
            <div className="p-6 pb-3">
              <h3 className="font-semibold leading-none tracking-tight">직접 입력</h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                셀을 클릭하여 목표와 실천 항목을 입력하세요
              </p>
            </div>
            <CardContent className="pt-0">
              <MandalartGrid
                mode="create"
                data={gridData}
                onCoreGoalClick={handleCoreGoalClick}
                onSectionClick={handleSectionClick}
                readonly={isLoading}
              />
            </CardContent>
          </Card>
        )}

        {/* Mobile: 3x3 Adaptive View */}
        {inputMethod && (
          <Card className="w-full md:hidden">
            <div className="p-4 pb-2">
              <h3 className="font-semibold leading-none tracking-tight">직접 입력</h3>
              <p className="text-sm text-muted-foreground mt-1.5">
                셀을 탭하여 목표와 실천 항목을 입력하세요
              </p>
            </div>
            <CardContent className="p-4 pt-0">
              {mobileExpandedSection === null ? (
                // Collapsed: 3x3 Sub-goals only
                <div className="grid grid-cols-3 gap-2">
                  {sectionPositions.map((sectionPos) => {
                    if (sectionPos === 0) {
                      // Center: Core goal
                      return (
                        <div
                          key={sectionPos}
                          className="aspect-square flex items-center justify-center p-1.5 rounded-lg cursor-pointer active:opacity-90 transition-opacity"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          }}
                          onClick={handleCoreGoalClick}
                        >
                          {gridData.center_goal ? (
                            <p className="text-base font-bold text-center line-clamp-3 text-white">
                              {gridData.center_goal}
                            </p>
                          ) : (
                            <Plus className="w-6 h-6 text-white/50" />
                          )}
                        </div>
                      )
                    }

                    const subGoal = getSubGoalByPosition(sectionPos)
                    return (
                      <div
                        key={sectionPos}
                        className="aspect-square flex flex-col items-center justify-center p-1.5 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer active:bg-blue-200 transition-colors"
                        onClick={() => handleMobileSectionTap(sectionPos)}
                      >
                        <p className="text-[10px] text-muted-foreground mb-1">세부 {sectionPos}</p>
                        <p className="text-sm font-medium text-center line-clamp-2">
                          {subGoal?.title || ''}
                        </p>
                        {subGoal && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {subGoal.actions.length}개
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Expanded: 3x3 grid of selected section
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMobileBack}
                    >
                      ← 뒤로
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSectionClick(mobileExpandedSection)}
                    >
                      수정
                    </Button>
                  </div>

                  <div
                    className="grid grid-cols-3 gap-px bg-gray-300 rounded cursor-pointer"
                    onClick={() => handleSectionClick(mobileExpandedSection)}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cellPos) => (
                      <div key={cellPos} className="aspect-square bg-white">
                        {renderMobileCell(mobileExpandedSection, cellPos)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {inputMethod && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setInputMethod(null)
                setTitle('')
                setGridData({ center_goal: '', sub_goals: [] })
                setUploadedImageUrl(null)
              }}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </div>

      {/* Core Goal Edit Modal */}
      <CoreGoalEditModal
        open={coreGoalModalOpen}
        onOpenChange={setCoreGoalModalOpen}
        mode="create"
        initialTitle={title}
        initialCenterGoal={gridData.center_goal}
        onCreate={handleCoreGoalSave}
        hideTitle={false}
      />

      {/* Sub Goal Modal (Create Mode) */}
      {selectedSubGoalPosition !== null && (
        <SubGoalModal
          mode="create"
          open={subGoalModalOpen}
          onOpenChange={setSubGoalModalOpen}
          position={selectedSubGoalPosition}
          initialTitle={getSubGoalInitialData().title}
          initialActions={getSubGoalInitialData().actions}
          onCreate={handleSubGoalSave}
        />
      )}
    </div>
  )
}
