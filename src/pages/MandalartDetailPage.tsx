import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Mandalart, SubGoal, Action } from '@/types'
import { Repeat, Target, Lightbulb } from 'lucide-react'
import SubGoalEditModal from '@/components/SubGoalEditModal'
import CoreGoalEditModal from '@/components/CoreGoalEditModal'

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
  const [selectedSection, setSelectedSection] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSubGoal, setSelectedSubGoal] = useState<(SubGoal & { actions: Action[] }) | null>(null)
  const [mobileExpandedSection, setMobileExpandedSection] = useState<number | null>(null)
  const [coreGoalModalOpen, setCoreGoalModalOpen] = useState(false)

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

  const createEmptySubGoal = async (position: number): Promise<(SubGoal & { actions: Action[] }) | undefined> => {
    if (!mandalart) return undefined

    try {
      const { data, error } = await supabase
        .from('sub_goals')
        .insert({
          mandalart_id: mandalart.id,
          title: `세부목표 ${position}`,
          position: position
        })
        .select()
        .single()

      if (error) throw error

      return { ...data, actions: [] } as SubGoal & { actions: Action[] }
    } catch (err) {
      console.error('Error creating sub-goal:', err)
      alert('세부목표 생성에 실패했습니다.')
      return undefined
    }
  }

  const handleSectionClick = async (sectionPos: number) => {
    let subGoal = getSubGoalByPosition(sectionPos)

    // If sub-goal doesn't exist, create it
    if (!subGoal) {
      const newSubGoal = await createEmptySubGoal(sectionPos)
      if (!newSubGoal) return

      // Refresh data to update UI
      await fetchMandalart()

      // Get the refreshed sub-goal
      subGoal = getSubGoalByPosition(sectionPos)
      if (!subGoal) return
    }

    setSelectedSection(sectionPos)
    setSelectedSubGoal(subGoal)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedSection(null)
    setSelectedSubGoal(null)
  }

  const handleModalSave = () => {
    // Refresh data after save
    fetchMandalart()
  }

  const handleMobileSectionTap = (sectionPos: number) => {
    // On mobile: first tap expands, second tap (or long press) opens modal
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

  // Render a single cell in the 9x9 grid
  const renderCell = (sectionPos: number, cellPos: number) => {
    // Center section (position 0)
    if (sectionPos === 0) {
      if (cellPos === 4) {
        // Center of center: Core goal
        return (
          <div
            className="flex items-center justify-center h-full p-2 cursor-pointer hover:opacity-90 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
            onClick={() => setCoreGoalModalOpen(true)}
          >
            <p className="text-sm font-bold text-center line-clamp-3 text-white">
              {mandalart?.center_goal}
            </p>
          </div>
        )
      } else {
        // Surrounding cells: Sub-goal titles
        const subGoalPosition = cellPos < 4 ? cellPos + 1 : cellPos
        const subGoal = getSubGoalByPosition(subGoalPosition)
        return (
          <div className="flex items-center justify-center h-full p-2 bg-blue-50 hover:bg-blue-100 transition-colors">
            <p className="text-xs font-medium text-center line-clamp-2">
              {subGoal?.title || `세부${subGoalPosition}`}
            </p>
          </div>
        )
      }
    }

    // Outer sections (positions 1-8)
    const subGoal = getSubGoalByPosition(sectionPos)
    if (!subGoal) {
      // Empty sub-goal cell
      return (
        <div className="flex items-center justify-center h-full p-2 bg-gray-50 hover:bg-gray-100 transition-colors">
          <p className="text-[10px] text-muted-foreground text-center">클릭하여 추가</p>
        </div>
      )
    }

    if (cellPos === 4) {
      // Center of section: Sub-goal title
      return (
        <div className="flex flex-col items-center justify-center h-full p-2 bg-blue-50 border border-blue-200">
          <p className="text-xs font-semibold text-center line-clamp-2">{subGoal.title}</p>
        </div>
      )
    } else {
      // Surrounding cells: Actions
      const actionIndex = cellPos < 4 ? cellPos : cellPos - 1
      const action = subGoal.actions[actionIndex]

      if (!action) {
        return (
          <div className="flex items-center justify-center h-full p-2 bg-white">
            <p className="text-[10px] text-muted-foreground">-</p>
          </div>
        )
      }

      return (
        <div className="flex items-center justify-center h-full p-2 bg-white hover:bg-gray-50 transition-colors">
          <p className="text-[11px] leading-tight line-clamp-3 text-center">{action.title}</p>
        </div>
      )
    }
  }

  // Render a 3x3 section
  const renderSection = (sectionPos: number) => {
    const isCenter = sectionPos === 0
    const isSelected = selectedSection === sectionPos

    return (
      <div
        key={sectionPos}
        className={`
          grid grid-cols-3 grid-rows-3 gap-px bg-gray-300 rounded
          ${!isCenter ? 'cursor-pointer hover:ring-2 hover:ring-primary/50' : ''}
          ${isSelected ? 'ring-2 ring-primary' : ''}
          transition-all
        `}
        onClick={() => !isCenter && handleSectionClick(sectionPos)}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cellPos) => (
          <div key={cellPos} className="bg-white">
            {renderCell(sectionPos, cellPos)}
          </div>
        ))}
      </div>
    )
  }

  // Section position mapping for 3x3 layout of sections
  const sectionPositions = [1, 2, 3, 4, 0, 5, 6, 7, 8]

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
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
        <div className="max-w-7xl mx-auto space-y-4">
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
      <div className="max-w-7xl mx-auto space-y-6">
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

        {/* Desktop: 9x9 Grid (3x3 of 3x3 sections) */}
        <Card className="hidden md:block">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {sectionPositions.map((sectionPos) => renderSection(sectionPos))}
            </div>
          </CardContent>
        </Card>

        {/* Mobile: Adaptive View */}
        <Card className="md:hidden">
          <CardContent className="p-4">
            {mobileExpandedSection === null ? (
              // Collapsed: 3x3 Sub-goals only
              <div className="grid grid-cols-3 gap-2">
                {sectionPositions.map((sectionPos) => {
                  if (sectionPos === 0) {
                    // Center: Core goal
                    return (
                      <div
                        key={sectionPos}
                        className="aspect-square flex items-center justify-center p-3 rounded-lg cursor-pointer active:opacity-90 transition-opacity"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                        onClick={() => setCoreGoalModalOpen(true)}
                      >
                        <p className="text-sm font-bold text-center line-clamp-3 text-white">
                          {mandalart.center_goal}
                        </p>
                      </div>
                    )
                  }

                  const subGoal = getSubGoalByPosition(sectionPos)
                  return (
                    <div
                      key={sectionPos}
                      className="aspect-square flex flex-col items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer active:bg-blue-200 transition-colors"
                      onClick={() => handleMobileSectionTap(sectionPos)}
                    >
                      <p className="text-[10px] text-muted-foreground mb-1">세부 {sectionPos}</p>
                      <p className="text-xs font-medium text-center line-clamp-2">
                        {subGoal?.title || '-'}
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
                    편집
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-px bg-gray-300 rounded">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cellPos) => (
                    <div key={cellPos} className="aspect-square bg-white">
                      {renderCell(mobileExpandedSection, cellPos)}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  다시 탭하거나 "편집" 버튼을 눌러 편집할 수 있습니다
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground mb-2">💡 사용 방법</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li className="hidden md:list-item">
                  전통적인 9x9 만다라트 형식으로 모든 내용(핵심목표 + 세부목표 8개 + 실천항목 64개)이 표시됩니다
                </li>
                <li className="hidden md:list-item">
                  각 3x3 섹션을 클릭하면 해당 세부목표와 실천항목을 편집할 수 있습니다
                </li>
                <li className="md:hidden">
                  세부목표를 탭하면 상세보기 및 편집이 가능합니다
                </li>
                <li>
                  타입 아이콘: <Repeat className="inline w-3 h-3 text-blue-500" /> 루틴,
                  <Target className="inline w-3 h-3 text-green-500 mx-1" /> 미션,
                  <Lightbulb className="inline w-3 h-3 text-amber-500 mx-1" /> 참고
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SubGoal Edit Modal */}
      {selectedSubGoal && (
        <SubGoalEditModal
          open={modalOpen}
          onOpenChange={handleModalClose}
          subGoal={selectedSubGoal}
          onSave={handleModalSave}
        />
      )}

      {/* Core Goal Edit Modal */}
      {mandalart && (
        <CoreGoalEditModal
          open={coreGoalModalOpen}
          onOpenChange={setCoreGoalModalOpen}
          mandalart={mandalart}
          onSave={fetchMandalart}
        />
      )}
    </div>
  )
}
