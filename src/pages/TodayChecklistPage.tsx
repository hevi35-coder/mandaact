import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Action, SubGoal, Mandalart, CheckHistory } from '@/types'
import { ActionType, shouldShowToday, getActionTypeLabel } from '@/lib/actionTypes'
import ActionTypeSelector, { ActionTypeData } from '@/components/ActionTypeSelector'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'

interface ActionWithContext extends Action {
  sub_goal: SubGoal & {
    mandalart: Mandalart
  }
  is_checked: boolean
  check_id?: string
}

export default function TodayChecklistPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [searchParams, setSearchParams] = useSearchParams()

  const [actions, setActions] = useState<ActionWithContext[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingActions, setCheckingActions] = useState<Set<string>>(new Set())

  // Date selection
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const dateParam = searchParams.get('date')
    return dateParam ? new Date(dateParam) : new Date()
  })

  // Type filter state - multiple selection using Set
  const [activeFilters, setActiveFilters] = useState<Set<ActionType>>(new Set())

  // Action type editor state
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ActionWithContext | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchTodayActions()
  }, [user, navigate, selectedDate])

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      const dateStr = format(date, 'yyyy-MM-dd')
      setSearchParams({ date: dateStr })
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isYesterday = (date: Date) => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    )
  }

  const isTodayOrYesterday = (date: Date) => {
    return isToday(date) || isYesterday(date)
  }

  const fetchTodayActions = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all actions with sub_goals and mandalarts
      const { data: actionsData, error: actionsError } = await supabase
        .from('actions')
        .select(`
          *,
          sub_goal:sub_goals (
            *,
            mandalart:mandalarts (*)
          )
        `)
        .eq('sub_goal.mandalart.user_id', user.id)

      if (actionsError) throw actionsError

      // Fetch check history for selected date
      const dayStart = new Date(selectedDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const { data: checksData, error: checksError } = await supabase
        .from('check_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('checked_at', dayStart.toISOString())
        .lt('checked_at', dayEnd.toISOString())

      if (checksError) throw checksError

      // Create a map of checked action IDs
      const checkedActionsMap = new Map<string, string>()
      checksData?.forEach((check: CheckHistory) => {
        checkedActionsMap.set(check.action_id, check.id)
      })

      // Combine data
      const actionsWithContext: ActionWithContext[] = (actionsData || [])
        .filter((action): action is typeof action & { sub_goal: { mandalart: Mandalart } } =>
          action.sub_goal?.mandalart != null
        )
        .filter((action) =>
          // Only show actions from active mandalarts
          action.sub_goal.mandalart.is_active !== false
        )
        .map((action) => ({
          ...action,
          sub_goal: action.sub_goal,
          is_checked: checkedActionsMap.has(action.id),
          check_id: checkedActionsMap.get(action.id)
        }))

      setActions(actionsWithContext)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCheck = async (action: ActionWithContext) => {
    if (!user) return
    if (checkingActions.has(action.id)) return // Prevent double-click
    if (!isTodayOrYesterday(selectedDate)) return // Can only check today or yesterday

    setCheckingActions(prev => new Set(prev).add(action.id))

    try {
      if (action.is_checked && action.check_id) {
        // Uncheck: Delete from check_history
        const { error: deleteError } = await supabase
          .from('check_history')
          .delete()
          .eq('id', action.check_id)

        if (deleteError) throw deleteError

        // Optimistic update
        setActions(prevActions =>
          prevActions.map(a =>
            a.id === action.id
              ? { ...a, is_checked: false, check_id: undefined }
              : a
          )
        )
      } else {
        // Check: Insert into check_history with selected date
        const checkDate = new Date(selectedDate)
        checkDate.setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds())

        const { data: checkData, error: insertError } = await supabase
          .from('check_history')
          .insert({
            action_id: action.id,
            user_id: user.id,
            checked_at: checkDate.toISOString()
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Optimistic update
        setActions(prevActions =>
          prevActions.map(a =>
            a.id === action.id
              ? { ...a, is_checked: true, check_id: checkData.id }
              : a
          )
        )
      }
    } catch (err) {
      console.error('Check toggle error:', err)
      alert('체크 상태 변경 중 오류가 발생했습니다')
      // Rollback by refetching
      fetchTodayActions()
    } finally {
      setCheckingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(action.id)
        return newSet
      })
    }
  }

  const openTypeEditor = (action: ActionWithContext, e: React.MouseEvent) => {
    e.stopPropagation()
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

      // Refresh actions list
      await fetchTodayActions()
    } catch (err) {
      console.error('Update error:', err)
      alert('타입 업데이트 중 오류가 발생했습니다')
    }
  }

  // Filter toggle functions
  const toggleFilter = (type: ActionType) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev)
      if (newFilters.has(type)) {
        newFilters.delete(type) // Re-click: deactivate
      } else {
        newFilters.add(type) // First click: activate
      }
      return newFilters
    })
  }

  const clearAllFilters = () => {
    setActiveFilters(new Set())
  }

  // Filter actions based on type and shouldShowToday logic
  const filteredActions = actions.filter((action) => {
    // Apply shouldShowToday logic
    const shouldShow = shouldShowToday(action)
    if (!shouldShow) return false

    // Apply type filters (multiple selection)
    // If no filters selected, show all types
    if (activeFilters.size === 0) return true

    // Show only if action type is in active filters
    return activeFilters.has(action.type)
  })

  // Group actions by mandalart
  const actionsByMandalart = filteredActions.reduce((groups, action) => {
    const mandalartId = action.sub_goal.mandalart.id
    if (!groups[mandalartId]) {
      groups[mandalartId] = {
        mandalart: action.sub_goal.mandalart,
        actions: []
      }
    }
    groups[mandalartId].actions.push(action)
    return groups
  }, {} as Record<string, { mandalart: Mandalart; actions: ActionWithContext[] }>)

  // Section collapse state - default expanded
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSection = (mandalartId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(mandalartId)) {
        newSet.delete(mandalartId)
      } else {
        newSet.add(mandalartId)
      }
      return newSet
    })
  }

  // Calculate progress (exclude reference actions)
  const nonReferenceActions = filteredActions.filter(a => a.type !== 'reference')
  const checkedCount = nonReferenceActions.filter(a => a.is_checked).length
  const totalCount = nonReferenceActions.length
  const progressPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-4">오늘의 실천</h1>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Navigation Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const yesterday = new Date(selectedDate)
                  yesterday.setDate(yesterday.getDate() - 1)
                  handleDateChange(yesterday)
                }}
              >
                ← 어제
              </Button>
              <Button
                variant={isToday(selectedDate) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateChange(new Date())}
              >
                오늘
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const tomorrow = new Date(selectedDate)
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  handleDateChange(tomorrow)
                }}
              >
                내일 →
              </Button>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-300" />

            {/* Calendar Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  📅 {format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Type Filter */}
        {actions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">타입 필터</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeFilters.size === 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={clearAllFilters}
                >
                  전체
                </Button>
                <Button
                  variant={activeFilters.has('routine') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('routine')}
                >
                  {getActionTypeLabel('routine')}
                </Button>
                <Button
                  variant={activeFilters.has('mission') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('mission')}
                >
                  {getActionTypeLabel('mission')}
                </Button>
                <Button
                  variant={activeFilters.has('reference') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('reference')}
                >
                  {getActionTypeLabel('reference')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 참고 항목은 체크할 수 없으며, 진행률에 포함되지 않습니다
              </p>
            </CardContent>
          </Card>
        )}

        {/* Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">오늘의 진행상황</span>
                <span className="text-muted-foreground">
                  {checkedCount} / {totalCount} 완료
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-center text-2xl font-bold text-primary">
                {progressPercentage}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {actions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="text-6xl">📝</div>
              <div>
                <p className="text-lg font-medium">실천 항목이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">
                  먼저 만다라트를 만들어보세요
                </p>
              </div>
              <Button onClick={() => navigate('/mandalart/create')}>
                만다라트 만들기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filtered Empty State */}
        {actions.length > 0 && filteredActions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="text-4xl">🔍</div>
              <div>
                <p className="text-lg font-medium">필터에 맞는 항목이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">
                  다른 타입 필터를 선택해보세요
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions List - Grouped by Mandalart */}
        {filteredActions.length > 0 && (
          <div className="space-y-6">
            {Object.entries(actionsByMandalart).map(([mandalartId, { mandalart, actions: mandalartActions }]) => {
              const isCollapsed = collapsedSections.has(mandalartId)
              const mandalartNonRef = mandalartActions.filter(a => a.type !== 'reference')
              const mandalartChecked = mandalartNonRef.filter(a => a.is_checked).length
              const mandalartTotal = mandalartNonRef.length

              return (
                <div key={mandalartId} className="space-y-3">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(mandalartId)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold">{mandalart.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {mandalartChecked}/{mandalartTotal}
                      </span>
                    </div>
                    <span className="text-xl">{isCollapsed ? '▶' : '▼'}</span>
                  </button>

                  {/* Actions in this Mandalart */}
                  {!isCollapsed && (
                    <div className="space-y-3 pl-2">
                      {mandalartActions.map((action) => (
                        <Card
                          key={action.id}
                          className={`transition-all ${
                            action.is_checked
                              ? 'bg-gray-50 border-gray-300'
                              : action.type === 'reference'
                              ? 'bg-gray-50/50 border-gray-200'
                              : 'hover:shadow-md'
                          }`}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={action.is_checked}
                                onChange={() => handleToggleCheck(action)}
                                disabled={
                                  checkingActions.has(action.id) ||
                                  action.type === 'reference' ||
                                  !isTodayOrYesterday(selectedDate)
                                }
                                className={`mt-1 h-5 w-5 rounded border-gray-300 text-primary ${
                                  action.type === 'reference' || !isTodayOrYesterday(selectedDate)
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'cursor-pointer focus:ring-primary'
                                } disabled:cursor-not-allowed`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle
                                    className={`text-base flex-1 ${
                                      action.is_checked
                                        ? 'line-through text-gray-500'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {action.title}
                                  </CardTitle>
                                  <button
                                    onClick={(e) => openTypeEditor(action, e)}
                                    className="text-xs px-2 py-0.5 rounded border border-gray-300 bg-white hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                                  >
                                    {getActionTypeLabel(action.type)}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                  <span>{action.sub_goal.title}</span>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Back Button */}
        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        </div>
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
