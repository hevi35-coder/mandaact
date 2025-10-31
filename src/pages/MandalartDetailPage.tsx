import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Mandalart, SubGoal, Action } from '@/types'
import ActionTypeSelector, { ActionTypeData } from '@/components/ActionTypeSelector'
import { getActionTypeLabel } from '@/lib/actionTypes'

interface MandalartWithDetails extends Mandalart {
  sub_goals: (SubGoal & { actions: Action[] })[]
}

export default function MandalartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [mandalart, setMandalart] = useState<MandalartWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubGoal, setSelectedSubGoal] = useState<number | null>(null)

  // Action type editor state
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!id) {
      navigate('/mandalart/list')
      return
    }
    fetchMandalart()
  }, [user, id, navigate])

  const fetchMandalart = async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch mandalart with sub_goals and actions
      const { data: mandalartData, error: mandalartError } = await supabase
        .from('mandalarts')
        .select('*')
        .eq('id', id)
        .single()

      if (mandalartError) throw mandalartError

      // Fetch sub_goals
      const { data: subGoalsData, error: subGoalsError } = await supabase
        .from('sub_goals')
        .select('*')
        .eq('mandalart_id', id)
        .order('position')

      if (subGoalsError) throw subGoalsError

      // Fetch actions for all sub_goals
      const subGoalIds = subGoalsData?.map(sg => sg.id) || []
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select('*')
        .in('sub_goal_id', subGoalIds)
        .order('position')

      if (actionsError) throw actionsError

      // Combine data
      const subGoalsWithActions = (subGoalsData || []).map(sg => ({
        ...sg,
        actions: (actionsData || []).filter(action => action.sub_goal_id === sg.id)
      }))

      setMandalart({
        ...mandalartData,
        sub_goals: subGoalsWithActions
      })
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : '만다라트를 불러오는 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const getSubGoalByPosition = (position: number) => {
    return mandalart?.sub_goals.find(sg => sg.position === position)
  }

  const openTypeEditor = (action: Action, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent sub-goal selection
    setSelectedAction(action)
    setTypeSelectorOpen(true)
  }

  const handleTypeSave = async (typeData: ActionTypeData) => {
    if (!selectedAction) return

    try {
      const { error: updateError } = await supabase
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
          ai_suggestion: typeData.ai_suggestion
        })
        .eq('id', selectedAction.id)

      if (updateError) throw updateError

      // Refresh mandalart data
      await fetchMandalart()
    } catch (err) {
      console.error('Update error:', err)
      setError(err instanceof Error ? err.message : '타입 업데이트 중 오류가 발생했습니다')
    }
  }

  // Grid position mapping for 9x9 layout
  // Positions 1-8 are arranged around center (position 0)
  const positionMap = [
    { position: 1, gridArea: '1 / 1 / 4 / 4' },   // Top-left
    { position: 2, gridArea: '1 / 4 / 4 / 7' },   // Top-center
    { position: 3, gridArea: '1 / 7 / 4 / 10' },  // Top-right
    { position: 4, gridArea: '4 / 1 / 7 / 4' },   // Middle-left
    { position: 0, gridArea: '4 / 4 / 7 / 7' },   // Center (핵심 목표)
    { position: 5, gridArea: '4 / 7 / 7 / 10' },  // Middle-right
    { position: 6, gridArea: '7 / 1 / 10 / 4' },  // Bottom-left
    { position: 7, gridArea: '7 / 4 / 10 / 7' },  // Bottom-center
    { position: 8, gridArea: '7 / 7 / 10 / 10' }, // Bottom-right
  ]

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !mandalart) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error || '만다라트를 찾을 수 없습니다'}
          </div>
          <Button variant="outline" onClick={() => navigate('/mandalart/list')}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{mandalart.title}</h1>
            <p className="text-muted-foreground mt-1">
              핵심 목표: {mandalart.center_goal}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/mandalart/list')}>
            목록으로
          </Button>
        </div>

        {/* 9x9 Grid */}
        <Card>
          <CardContent className="p-6">
            <div
              className="grid gap-2"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(9, 1fr)',
                gridTemplateRows: 'repeat(9, 1fr)',
                minHeight: '600px'
              }}
            >
              {positionMap.map(({ position, gridArea }) => {
                if (position === 0) {
                  // Center: 핵심 목표
                  return (
                    <div
                      key="center"
                      className="border-2 border-primary bg-primary/10 rounded-lg p-4 flex items-center justify-center text-center"
                      style={{ gridArea }}
                    >
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">핵심 목표</p>
                        <p className="font-bold text-lg">{mandalart.center_goal}</p>
                      </div>
                    </div>
                  )
                }

                const subGoal = getSubGoalByPosition(position)
                if (!subGoal) {
                  return (
                    <div
                      key={position}
                      className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-center"
                      style={{ gridArea }}
                    >
                      <p className="text-xs text-muted-foreground">세부 목표 {position}</p>
                    </div>
                  )
                }

                const isSelected = selectedSubGoal === position
                return (
                  <div
                    key={position}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
                    }`}
                    style={{ gridArea }}
                    onClick={() => setSelectedSubGoal(isSelected ? null : position)}
                  >
                    <div className="h-full flex flex-col">
                      <p className="text-xs text-muted-foreground mb-2">세부 목표 {position}</p>
                      <p className="font-medium text-sm mb-2">{subGoal.title}</p>
                      <div className="flex-1 overflow-y-auto">
                        {isSelected && (
                          <div className="space-y-1 mt-2 pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground">실천 항목:</p>
                            {subGoal.actions.length > 0 ? (
                              subGoal.actions.map((action, idx) => (
                                <div
                                  key={action.id}
                                  className="text-xs p-2 bg-white rounded flex items-center justify-between gap-2 hover:bg-gray-50 group"
                                >
                                  <span className="flex-1">
                                    {idx + 1}. {action.title}
                                  </span>
                                  <button
                                    onClick={(e) => openTypeEditor(action, e)}
                                    className="text-xs px-2 py-0.5 rounded border border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors"
                                  >
                                    {getActionTypeLabel(action.type)}
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground italic">실천 항목 없음</p>
                            )}
                          </div>
                        )}
                      </div>
                      {!isSelected && subGoal.actions.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          📋 {subGoal.actions.length}개 항목
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">사용 방법</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>중앙의 핵심 목표를 중심으로 8개의 세부 목표가 배치되어 있습니다</li>
              <li>세부 목표를 클릭하면 해당 목표의 실천 항목을 볼 수 있습니다</li>
              <li>각 세부 목표는 최대 8개의 실천 항목을 가질 수 있습니다</li>
              <li>실천 항목 옆의 타입 배지를 클릭하면 타입 설정을 변경할 수 있습니다</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Action Type Selector Dialog */}
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
          }}
          onSave={handleTypeSave}
        />
      )}
    </div>
  )
}
