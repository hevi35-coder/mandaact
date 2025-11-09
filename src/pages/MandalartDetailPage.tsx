import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { SubGoal, Action, MandalartGridData, MandalartWithDetails } from '@/types'
import { Repeat, Target, Lightbulb, Download } from 'lucide-react'
import SubGoalEditModal from '@/components/SubGoalEditModal'
import CoreGoalEditModal from '@/components/CoreGoalEditModal'
import MandalartGrid from '@/components/MandalartGrid'
import html2canvas from 'html2canvas'
import { useToast } from '@/hooks/use-toast'

export default function MandalartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { toast } = useToast()
  const gridRef = useRef<HTMLDivElement>(null)

  const [mandalart, setMandalart] = useState<MandalartWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSubGoal, setSelectedSubGoal] = useState<(SubGoal & { actions: Action[] }) | null>(null)
  const [mobileExpandedSection, setMobileExpandedSection] = useState<number | null>(null)
  const [coreGoalModalOpen, setCoreGoalModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

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
        actions: (actionsData || [])
          .filter(action => action.sub_goal_id === sg.id)
          .sort((a, b) => a.position - b.position)
      }))

      const newMandalart = {
        ...mandalartData,
        sub_goals: subGoalsWithActions
      }

      setMandalart(newMandalart)
      return newMandalart // Return the fresh data
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

  // Convert MandalartWithDetails to MandalartGridData
  const convertToGridData = (): MandalartGridData => {
    if (!mandalart) {
      return {
        center_goal: '',
        sub_goals: []
      }
    }

    return {
      center_goal: mandalart.center_goal,
      sub_goals: mandalart.sub_goals.map(sg => ({
        position: sg.position,
        title: sg.title,
        actions: sg.actions.map(a => ({
          position: a.position,
          title: a.title,
          type: a.type
        }))
      }))
    }
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

    setSelectedSubGoal(subGoal)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedSubGoal(null)
  }

  const handleModalSave = async () => {
    // Refresh data after save
    if (!selectedSubGoal) return

    const position = selectedSubGoal.position
    const freshData = await fetchMandalart()

    // Update selectedSubGoal with fresh data
    if (freshData) {
      const updatedSubGoal = freshData.sub_goals.find((sg: SubGoal & { actions: Action[] }) => sg.position === position)
      if (updatedSubGoal) {
        setSelectedSubGoal(updatedSubGoal)
      }
    }
  }

  const handleMobileSectionTap = (sectionPos: number) => {
    // On mobile: first tap expands, second tap opens modal
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

  // Render cell for mobile expanded view
  const renderMobileCell = (sectionPos: number, cellPos: number) => {
    const subGoal = getSubGoalByPosition(sectionPos)
    if (!subGoal) return null

    if (cellPos === 4) {
      // Center: Sub-goal title
      return (
        <div className="flex flex-col items-center justify-center h-full p-2 bg-blue-50 border border-blue-200">
          <p className="text-base font-semibold line-clamp-3 text-center">
            {subGoal.title}
          </p>
        </div>
      )
    } else {
      // Actions
      const actionIndex = cellPos < 4 ? cellPos : cellPos - 1
      const action = subGoal.actions[actionIndex]

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

  const handleDelete = async () => {
    if (!mandalart || !id) return

    if (!confirm(`"${mandalart.title}" 만다라트를 삭제하시겠습니까? 모든 하위 데이터가 함께 삭제됩니다.`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('mandalarts')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      toast({
        title: '삭제 완료',
        description: '만다라트가 삭제되었습니다.',
      })

      navigate('/mandalart/list')
    } catch (err) {
      console.error('Delete error:', err)
      toast({
        title: '삭제 실패',
        description: '삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadImage = async (size: 'mobile' | 'tablet' | 'desktop') => {
    if (!gridRef.current || !mandalart) return

    setIsDownloading(true)
    toast({
      title: '이미지 생성 중...',
      description: '잠시만 기다려주세요.',
    })

    try {
      const sizeMap = {
        mobile: 800,
        tablet: 1200,
        desktop: 1600,
      }
      const targetWidth = sizeMap[size]
      const scale = targetWidth / gridRef.current.offsetWidth

      const canvas = await html2canvas(gridRef.current, {
        scale: scale,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      })

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image')
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const fileName = `${mandalart.title}_${size}_${new Date().toISOString().split('T')[0]}.png`
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast({
          title: '다운로드 완료!',
          description: `${size === 'mobile' ? '모바일' : size === 'tablet' ? '태블릿' : '데스크톱'} 사이즈 (${targetWidth}x${targetWidth}px)`,
        })
      }, 'image/png')
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: '다운로드 실패',
        description: '이미지 생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDownloading(false)
    }
  }


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
    <div className="container mx-auto py-3 md:py-6 px-4 pb-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold">{mandalart.title}</h1>
            <p className="text-muted-foreground mt-1">
              핵심 목표: {mandalart.center_goal}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/mandalart/list')}>
              목록
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" disabled={isDownloading}>
                  <Download className="w-4 h-4 mr-2" />
                  {isDownloading ? '생성 중...' : '다운로드'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownloadImage('mobile')}>
                  📱 모바일 (800x800px)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadImage('tablet')}>
                  💻 태블릿 (1200x1200px)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadImage('desktop')}>
                  🖥️ 데스크톱 (1600x1600px)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={handleDelete}
            >
              삭제
            </Button>
          </div>
        </div>

        {/* Hidden Grid for Download (always rendered, works on mobile too) */}
        <div className="fixed -left-[9999px] top-0 bg-white" style={{ width: '1200px', height: '1200px' }}>
          <div ref={gridRef}>
            <MandalartGrid
              mode="view"
              data={convertToGridData()}
              readonly
              forDownload
            />
          </div>
        </div>

        {/* Desktop: 9x9 Grid (3x3 of 3x3 sections) */}
        <Card className="hidden md:block">
          <CardContent className="p-6">
            <MandalartGrid
              mode="view"
              data={convertToGridData()}
              onCoreGoalClick={() => setCoreGoalModalOpen(true)}
              onSectionClick={handleSectionClick}
            />
          </CardContent>
        </Card>

        {/* Mobile: Adaptive 3x3 View */}
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
                        className="aspect-square flex items-center justify-center p-1.5 rounded-lg cursor-pointer active:opacity-90 transition-opacity"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                        onClick={() => setCoreGoalModalOpen(true)}
                      >
                        <p className="text-base font-bold text-center line-clamp-3 text-white">
                          {mandalart.center_goal}
                        </p>
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

        {/* Instructions */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                사용 방법
              </p>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>• 각 영역을 탭하여 상세보기 및 수정이 가능합니다.</p>
                <div className="flex items-center gap-2">
                  <span>• 타입 구분:</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Repeat className="w-3 h-3 text-blue-500" />
                      <span>루틴</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-green-500" />
                      <span>미션</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      <span>참고</span>
                    </div>
                  </div>
                </div>
              </div>
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
          onEdit={handleModalSave}
        />
      )}

      {/* Core Goal Edit Modal */}
      {mandalart && (
        <CoreGoalEditModal
          open={coreGoalModalOpen}
          onOpenChange={setCoreGoalModalOpen}
          mode="edit"
          mandalart={mandalart}
          onEdit={fetchMandalart}
        />
      )}
    </div>
  )
}
