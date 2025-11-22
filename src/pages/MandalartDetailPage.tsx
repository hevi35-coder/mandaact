import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { SubGoal, Action, MandalartGridData, MandalartWithDetails } from '@/types'
import { Repeat, Target, Lightbulb, Download, AlertTriangle, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import SubGoalModal from '@/components/SubGoalModal'
import CoreGoalEditModal from '@/components/CoreGoalEditModal'
import MandalartGrid from '@/components/MandalartGrid'
import { domToPng } from 'modern-screenshot'
import { ERROR_MESSAGES, SUCCESS_MESSAGES, DOWNLOAD_MESSAGES } from '@/lib/notificationMessages'
import { showError, showSuccess, showInfo } from '@/lib/notificationUtils'
import { getUserToday } from '@/lib/timezone'

export default function MandalartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const gridRef = useRef<HTMLDivElement>(null)

  const [mandalart, setMandalart] = useState<MandalartWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSubGoal, setSelectedSubGoal] = useState<(SubGoal & { actions: Action[] }) | null>(null)
  const [mobileExpandedSection, setMobileExpandedSection] = useState<number | null>(null)
  const [coreGoalModalOpen, setCoreGoalModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteDialogStep, setDeleteDialogStep] = useState<'choice' | 'confirm'>('choice')
  const [deletionStats, setDeletionStats] = useState({ totalChecks: 0, totalSubGoals: 0, totalActions: 0 })

  const fetchMandalart = useCallback(async () => {
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
  }, [id])

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
  }, [user, id, navigate, fetchMandalart])

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
      showError(ERROR_MESSAGES.subGoalCreateFailed())
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

  const handleDeactivate = async () => {
    if (!mandalart || !id) return

    try {
      const { error: updateError } = await supabase
        .from('mandalarts')
        .update({ is_active: false })
        .eq('id', id)

      if (updateError) throw updateError

      showSuccess(SUCCESS_MESSAGES.deactivated())

      navigate('/mandalart/list')
    } catch (err) {
      console.error('Deactivate error:', err)
      showError(ERROR_MESSAGES.deactivateFailed())
    }
  }

  const handleDelete = async () => {
    if (!mandalart || !id) return

    // Get deletion impact data
    const { count: checkCount } = await supabase
      .from('check_history')
      .select('id', { count: 'exact', head: true })
      .in('action_id',
        mandalart.sub_goals.flatMap(sg => sg.actions?.map(a => a.id) || [])
      )

    const totalChecks = checkCount || 0
    const totalSubGoals = mandalart.sub_goals.length
    const totalActions = mandalart.sub_goals.reduce((sum, sg) => sum + (sg.actions?.length || 0), 0)

    // Store stats and open dialog
    setDeletionStats({ totalChecks, totalSubGoals, totalActions })
    setDeleteDialogStep('choice')
    setDeleteDialogOpen(true)
  }

  const handleDeleteChoice = (choice: 'deactivate' | 'delete') => {
    if (choice === 'deactivate') {
      setDeleteDialogOpen(false)
      handleDeactivate()
    } else {
      setDeleteDialogStep('confirm')
    }
  }

  const handlePermanentDelete = async () => {
    if (!id) return

    setDeleteDialogOpen(false)

    try {
      const { error: deleteError } = await supabase
        .from('mandalarts')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      showSuccess(SUCCESS_MESSAGES.permanentlyDeleted())

      navigate('/mandalart/list')
    } catch (err) {
      console.error('Delete error:', err)
      showError(ERROR_MESSAGES.deleteFailed())
    }
  }

  const handleDownloadImage = async () => {
    if (!gridRef.current || !mandalart) return

    setIsDownloading(true)
    showInfo(DOWNLOAD_MESSAGES.processing())

    try {
      // Use modern-screenshot for better Modern CSS support
      const dataUrl = await domToPng(gridRef.current, {
        scale: 2, // 2x for high resolution
        backgroundColor: '#ffffff',
        width: 1920,
        height: 1920,
      })

      // Download with user's local date
      const link = document.createElement('a')
      const fileName = `만다라트_${mandalart.title}_${getUserToday()}.png`
      link.href = dataUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showSuccess(DOWNLOAD_MESSAGES.success())
    } catch (error) {
      console.error('Download error:', error)
      showError(DOWNLOAD_MESSAGES.failed())
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
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold inline-block">{mandalart.title}</h1>
            <span className="text-muted-foreground ml-3 text-sm">{mandalart.center_goal}</span>
          </div>
          <div className="flex gap-2 flex-wrap justify-center md:justify-end">
            <Button variant="outline" onClick={() => navigate('/mandalart/list')}>
              만다라트 목록
            </Button>
            <Button
              variant="default"
              disabled={isDownloading}
              onClick={handleDownloadImage}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? '생성 중...' : '다운로드'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
            >
              삭제
            </Button>
          </div>
        </div>

        {/* Hidden Grid for Download (perfect square, high resolution) */}
        <div
          className="fixed -left-[9999px] top-0 bg-white"
          style={{
            width: '2000px',
            height: '2000px',
            padding: '40px', // Padding for better visual balance
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            ref={gridRef}
            style={{
              width: '1920px',
              height: '1920px' // Perfect square guaranteed
            }}
          >
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

      {/* SubGoal Modal (Edit Mode) */}
      {selectedSubGoal && (
        <SubGoalModal
          mode="edit"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialogStep === 'choice' ? '만다라트 삭제' : '영구 삭제 확인'}
            </AlertDialogTitle>
            <AlertDialogDescription className="flex items-center justify-center gap-2">
              {deleteDialogStep === 'choice' ? (
                <>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
                  <span>경고: 이 작업은 되돌릴 수 없습니다</span>
                </>
              ) : (
                '삭제된 데이터는 복구할 수 없습니다.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {deleteDialogStep === 'choice' ? (
              <>

                {/* 삭제되는 데이터 */}
                <div className="space-y-2">
                  <Label>삭제되는 데이터</Label>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>{deletionStats.totalChecks}회의 체크 기록</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>{deletionStats.totalSubGoals}개의 세부 목표</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>{deletionStats.totalActions}개의 실천 항목</span>
                    </li>
                  </ul>
                </div>

                {/* 유지되는 데이터 */}
                <div className="space-y-2">
                  <Label>유지되는 데이터</Label>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>획득한 XP 및 레벨 (변동 없음)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>•</span>
                      <span>해금된 배지 (영구 보존)</span>
                    </li>
                  </ul>
                </div>

                {/* 비활성화 권장 안내 */}
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium">비활성화를 권장합니다.</span> 데이터는 보존되며 언제든 복구 가능합니다.
                  </span>
                </p>
              </>
              ) : (
                <>
                  {/* 최종 확인 안내 */}
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium">정말로 영구 삭제하시겠습니까?</span><br />
                      {deletionStats.totalChecks}개의 체크 기록이 완전히 사라집니다.
                    </span>
                  </p>
                </>
              )}
          </div>

          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            {deleteDialogStep === 'choice' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteChoice('delete')}
                >
                  영구 삭제
                </Button>
                <Button
                  onClick={() => handleDeleteChoice('deactivate')}
                >
                  비활성화 (권장)
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogStep('choice')}
                >
                  뒤로
                </Button>
                <Button
                  variant="destructive"
                  onClick={handlePermanentDelete}
                >
                  영구 삭제 확정
                </Button>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
