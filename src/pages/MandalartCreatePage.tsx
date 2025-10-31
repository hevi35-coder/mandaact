import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import ActionTypeSelector, { ActionTypeData } from '@/components/ActionTypeSelector'
import { getActionTypeLabel } from '@/lib/actionTypes'

interface ActionData {
  title: string
  typeData?: ActionTypeData
}

interface SubGoalData {
  title: string
  actions: ActionData[] // 8 actions per sub-goal
}

export default function MandalartCreatePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [title, setTitle] = useState('')
  const [centerGoal, setCenterGoal] = useState('')
  const [subGoals, setSubGoals] = useState<SubGoalData[]>(
    Array(8).fill(null).map(() => ({
      title: '',
      actions: Array(8).fill(null).map(() => ({ title: '' }))
    }))
  )
  const [expandedSubGoal, setExpandedSubGoal] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Action type selector state
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<{ sgIndex: number; actionIndex: number } | null>(null)

  const updateSubGoalTitle = (index: number, value: string) => {
    const newSubGoals = [...subGoals]
    newSubGoals[index].title = value
    setSubGoals(newSubGoals)
  }

  const updateAction = (subGoalIndex: number, actionIndex: number, value: string) => {
    const newSubGoals = [...subGoals]
    newSubGoals[subGoalIndex].actions[actionIndex].title = value
    setSubGoals(newSubGoals)
  }

  const openTypeSelector = (sgIndex: number, actionIndex: number) => {
    setSelectedAction({ sgIndex, actionIndex })
    setTypeSelectorOpen(true)
  }

  const handleTypeSave = (typeData: ActionTypeData) => {
    if (!selectedAction) return

    const newSubGoals = [...subGoals]
    newSubGoals[selectedAction.sgIndex].actions[selectedAction.actionIndex].typeData = typeData
    setSubGoals(newSubGoals)
  }

  const handleSave = async () => {
    if (!user) {
      setError('로그인이 필요합니다')
      return
    }

    if (!title.trim() || !centerGoal.trim()) {
      setError('제목과 핵심 목표를 입력해주세요')
      return
    }

    // Validate sub-goals
    const filledSubGoals = subGoals.filter(sg => sg.title.trim())
    if (filledSubGoals.length === 0) {
      setError('최소 1개의 세부 목표를 입력해주세요')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Create mandalart
      const { data: mandalart, error: mandalartError } = await supabase
        .from('mandalarts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          center_goal: centerGoal.trim(),
          input_method: 'manual'
        })
        .select()
        .single()

      if (mandalartError) throw mandalartError

      // 2. Create sub-goals
      const subGoalsToInsert = subGoals
        .map((sg, index) => ({
          mandalart_id: mandalart.id,
          position: index + 1,
          title: sg.title.trim()
        }))
        .filter(sg => sg.title)

      const { data: createdSubGoals, error: subGoalsError } = await supabase
        .from('sub_goals')
        .insert(subGoalsToInsert)
        .select()

      if (subGoalsError) throw subGoalsError

      // 3. Create actions
      const actionsToInsert = createdSubGoals.flatMap((sg, sgIndex) => {
        const originalSubGoal = subGoals.find((_, i) =>
          subGoalsToInsert[sgIndex].position === i + 1
        )
        if (!originalSubGoal) return []

        return originalSubGoal.actions
          .map((action, actionIndex) => ({
            sub_goal_id: sg.id,
            position: actionIndex + 1,
            title: action.title.trim(),
            // Type data
            type: action.typeData?.type || 'routine',
            routine_frequency: action.typeData?.routine_frequency,
            routine_weekdays: action.typeData?.routine_weekdays,
            routine_count_per_period: action.typeData?.routine_count_per_period,
            mission_completion_type: action.typeData?.mission_completion_type,
            mission_period_cycle: action.typeData?.mission_period_cycle,
            mission_current_period_start: action.typeData?.mission_current_period_start,
            mission_current_period_end: action.typeData?.mission_current_period_end,
            ai_suggestion: action.typeData?.ai_suggestion
          }))
          .filter(action => action.title)
      })

      if (actionsToInsert.length > 0) {
        const { error: actionsError } = await supabase
          .from('actions')
          .insert(actionsToInsert)

        if (actionsError) throw actionsError
      }

      // Success! Redirect to dashboard or mandalart view
      console.log('Mandalart created successfully!')
      navigate('/dashboard')
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">만다라트 만들기</h1>
          <p className="text-muted-foreground mt-1">
            핵심 목표와 세부 목표, 실천 항목을 입력하세요
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {/* Title and Center Goal */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>만다라트 제목과 핵심 목표를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="예: 2025년 목표"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="centerGoal">핵심 목표 (중앙)</Label>
              <Input
                id="centerGoal"
                placeholder="예: 건강한 삶"
                value={centerGoal}
                onChange={(e) => setCenterGoal(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sub Goals */}
        <Card>
          <CardHeader>
            <CardTitle>세부 목표 (8개)</CardTitle>
            <CardDescription>
              핵심 목표를 달성하기 위한 8개의 세부 목표를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subGoals.map((subGoal, sgIndex) => (
              <div key={sgIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="w-20">목표 {sgIndex + 1}</Label>
                  <Input
                    placeholder={`세부 목표 ${sgIndex + 1}`}
                    value={subGoal.title}
                    onChange={(e) => updateSubGoalTitle(sgIndex, e.target.value)}
                    disabled={isLoading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedSubGoal(
                      expandedSubGoal === sgIndex ? null : sgIndex
                    )}
                    disabled={!subGoal.title.trim()}
                  >
                    {expandedSubGoal === sgIndex ? '접기' : '실천 항목'}
                  </Button>
                </div>

                {/* Actions for this sub-goal */}
                {expandedSubGoal === sgIndex && (
                  <div className="ml-24 space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground">
                      실천 항목 (8개)
                    </p>
                    {subGoal.actions.map((action, actionIndex) => (
                      <div key={actionIndex} className="flex items-center gap-2">
                        <Label className="w-16 text-xs">항목 {actionIndex + 1}</Label>
                        <Input
                          placeholder={`실천 항목 ${actionIndex + 1}`}
                          value={action.title}
                          onChange={(e) => updateAction(sgIndex, actionIndex, e.target.value)}
                          disabled={isLoading}
                          className="flex-1"
                        />
                        {action.title.trim() && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openTypeSelector(sgIndex, actionIndex)}
                              disabled={isLoading}
                            >
                              {action.typeData
                                ? getActionTypeLabel(action.typeData.type)
                                : '타입 설정'}
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/dashboard')}
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
      </div>

      {/* Action Type Selector Dialog */}
      {selectedAction && (
        <ActionTypeSelector
          open={typeSelectorOpen}
          onOpenChange={setTypeSelectorOpen}
          actionTitle={
            subGoals[selectedAction.sgIndex]?.actions[selectedAction.actionIndex]?.title || ''
          }
          initialData={
            subGoals[selectedAction.sgIndex]?.actions[selectedAction.actionIndex]?.typeData
          }
          onSave={handleTypeSave}
        />
      )}
    </div>
  )
}
