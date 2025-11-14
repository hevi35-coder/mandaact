import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Calendar as CalendarIcon, Info, ChevronRight, ChevronDown, ListTodo, ArrowRight, CheckCircle2, Grid3x3, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Action, SubGoal, Mandalart, CheckHistory } from '@/types'
import { ActionType, shouldShowToday, getActionTypeLabel, formatTypeDetails } from '@/lib/actionTypes'
import { getTypeIcon } from '@/lib/iconUtils'
import ActionTypeSelector, { ActionTypeData } from '@/components/ActionTypeSelector'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { ERROR_MESSAGES, SUCCESS_MESSAGES, ACHIEVEMENT_MESSAGES } from '@/lib/notificationMessages'
import { showError, showSuccess, showCelebration } from '@/lib/notificationUtils'
import { getDayBoundsUTC, getCurrentUTC } from '@/lib/timezone'

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
  const [totalMandalartCount, setTotalMandalartCount] = useState(0)

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
      // Fetch total mandalart count (including inactive)
      const { count: mandalartCount, error: countError } = await supabase
        .from('mandalarts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (countError) throw countError
      setTotalMandalartCount(mandalartCount || 0)

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

      // Fetch check history for selected date (using timezone-aware bounds)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const { start: dayStart, end: dayEnd } = getDayBoundsUTC(dateStr)

      const { data: checksData, error: checksError } = await supabase
        .from('check_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('checked_at', dayStart)
        .lt('checked_at', dayEnd)

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
      // Double-check current state before proceeding (using timezone-aware bounds)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const { start: dayStart, end: dayEnd } = getDayBoundsUTC(dateStr)

      const { data: existingChecks } = await supabase
        .from('check_history')
        .select('*')
        .eq('action_id', action.id)
        .eq('user_id', user.id)
        .gte('checked_at', dayStart)
        .lt('checked_at', dayEnd)

      const currentCheck = existingChecks && existingChecks.length > 0 ? existingChecks[0] : null

      if (currentCheck) {
        // Uncheck: Delete from check_history
        const { error: deleteError } = await supabase
          .from('check_history')
          .delete()
          .eq('id', currentCheck.id)

        if (deleteError) throw deleteError

        // Subtract XP when unchecking
        try {
          const { updateUserXP, getStreakStats } = await import('@/lib/stats')
          const { getActiveMultipliers, calculateTotalMultiplier } = await import('@/lib/xpMultipliers')

          // Calculate XP to subtract (same logic as adding)
          const streakStats = await getStreakStats(user.id)
          const baseXP = 10
          const streakBonus = streakStats.current >= 7 ? 5 : 0
          const subtotalXP = baseXP + streakBonus

          // Apply multipliers
          const multipliers = await getActiveMultipliers(user.id)
          const totalMultiplier = calculateTotalMultiplier(multipliers)
          const finalXP = Math.floor(subtotalXP * totalMultiplier)

          await updateUserXP(user.id, -finalXP) // Negative to subtract
        } catch (xpError) {
          console.error('XP update error:', xpError)
        }

        // Optimistic update
        setActions(prevActions =>
          prevActions.map(a =>
            a.id === action.id
              ? { ...a, is_checked: false, check_id: undefined }
              : a
          )
        )
      } else {
        // Check: Validate with anti-cheat first
        const { data: validationData, error: validationError } = await supabase
          .rpc('validate_and_record_check', {
            p_user_id: user.id,
            p_action_id: action.id,
            p_checked_at: getCurrentUTC()
          })

        if (validationError) {
          console.error('Validation error:', validationError)
          throw new Error('체크 검증에 실패했습니다')
        }

        // Check validation result
        if (!validationData.allowed) {
          let errorMessage = '체크할 수 없습니다'

          switch (validationData.reason) {
            case 'daily_limit_exceeded':
              errorMessage = '하루 3회까지만 체크/해제가 가능합니다'
              break
            case 'too_fast_recheck':
              errorMessage = '너무 빠르게 다시 체크하셨습니다. 잠시 후 다시 시도해주세요'
              break
            case 'rapid_spam_detected':
              errorMessage = '너무 많은 체크를 시도하셨습니다. 잠시 후 다시 시도해주세요'
              break
          }

          showError(errorMessage)
          setCheckingActions(prev => {
            const newSet = new Set(prev)
            newSet.delete(action.id)
            return newSet
          })
          return
        }

        // Insert into check_history with current UTC timestamp
        const { data: checkData, error: insertError } = await supabase
          .from('check_history')
          .insert({
            action_id: action.id,
            user_id: user.id,
            checked_at: getCurrentUTC()
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Update user XP for the new check
        {
          try {
            const { updateUserXP, getStreakStats, checkAndAwardPerfectDayXP, getCompletionStats } = await import('@/lib/stats')
            const { activatePerfectWeekBonus, getActiveMultipliers, calculateTotalMultiplier } = await import('@/lib/xpMultipliers')

            // Calculate base XP
            const streakStats = await getStreakStats(user.id)
            const baseXP = 10
            const streakBonus = streakStats.current >= 7 ? 5 : 0
            const subtotalXP = baseXP + streakBonus

            // Apply multipliers
            const multipliers = await getActiveMultipliers(user.id)
            const totalMultiplier = calculateTotalMultiplier(multipliers)
            const finalXP = Math.floor(subtotalXP * totalMultiplier)

            await updateUserXP(user.id, finalXP)

            // Show XP gained notification
            if (multipliers.length > 0 && totalMultiplier > 1) {
              showSuccess(`+${finalXP} XP (×${totalMultiplier.toFixed(1)} 배율 적용!)`)
            } else {
              showSuccess(`+${finalXP} XP`)
            }

            // Check for perfect day bonus (100% completion)
            // Wait a bit for the check to be reflected in stats
            setTimeout(async () => {
              try {
                const checkDate = format(selectedDate, 'yyyy-MM-dd')
                const result = await checkAndAwardPerfectDayXP(user.id, checkDate)

                if (result.is_perfect_day && result.xp_awarded > 0) {
                  // Show success toast
                  showCelebration(ACHIEVEMENT_MESSAGES.perfectDay(result.xp_awarded))
                  console.log('🎉 Perfect day bonus awarded: +' + result.xp_awarded + ' XP')
                }

                // Check for perfect week bonus (80%+ weekly completion)
                const completionStats = await getCompletionStats(user.id)
                if (completionStats.week.percentage >= 80) {
                  const activated = await activatePerfectWeekBonus(user.id)
                  if (activated) {
                    console.log('✨ Perfect week bonus activated: 2x XP for 7 days')
                  }
                }

                // Check and unlock new achievements
                const { checkAndUnlockAchievements } = await import('@/lib/stats')
                const newlyUnlocked = await checkAndUnlockAchievements(user.id)

                if (newlyUnlocked && newlyUnlocked.length > 0) {
                  for (const badge of newlyUnlocked) {
                    showCelebration(`🏆 새로운 배지 획득: ${badge.title}`)
                    console.log('🏆 Badge unlocked:', badge.title, '+' + badge.xp_reward + ' XP')
                  }
                }
              } catch (bonusError) {
                console.error('Perfect day bonus error:', bonusError)
              }
            }, 500)
          } catch (xpError) {
            console.error('XP update error:', xpError)
            // Don't fail the whole operation if XP update fails
          }
        }

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
      showError(ERROR_MESSAGES.checkToggleFailed())
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

      // Show success feedback
      showSuccess(SUCCESS_MESSAGES.typeUpdated())
    } catch (err) {
      console.error('Update error:', err)
      showError(ERROR_MESSAGES.typeUpdateFailed())
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

  // Type filter collapse state - default collapsed
  const [typeFilterCollapsed, setTypeFilterCollapsed] = useState(true)

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
    <div className="container mx-auto py-3 md:py-6 px-4 pb-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold inline-block">투데이</h1>
            <span className="text-muted-foreground ml-3 text-sm">오늘의 실천</span>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
            {/* Quick Navigation Buttons */}
            {/* Date Navigation Button Group */}
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const yesterday = new Date(selectedDate)
                  yesterday.setDate(yesterday.getDate() - 1)
                  handleDateChange(yesterday)
                }}
                className="rounded-r-none border-r-0"
              >
                어제
              </Button>
              <Button
                variant={isToday(selectedDate) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateChange(new Date())}
                className="rounded-none border-r-0"
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
                className="rounded-l-none"
              >
                내일
              </Button>
            </div>

            {/* Calendar Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}
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

        {/* Progress Card with Type Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base">오늘의 달성율</CardTitle>
                <span className="text-lg font-bold text-primary">{progressPercentage}%</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {checkedCount} / {totalCount}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-left flex items-center justify-start gap-1">
              <Info className="h-3 w-3" />
              오늘과 어제 날짜만 달성(체크) 가능합니다
            </p>

            {/* Type Filter - Collapsible Section */}
            {actions.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <button
                    onClick={() => setTypeFilterCollapsed(!typeFilterCollapsed)}
                    className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity mb-3"
                  >
                    <span className="text-sm font-medium">타입 필터</span>
                    {typeFilterCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {!typeFilterCollapsed && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <Button
                          variant={activeFilters.size === 0 ? 'default' : 'outline'}
                          size="sm"
                          onClick={clearAllFilters}
                          className="w-full"
                        >
                          전체
                        </Button>
                        <Button
                          variant={activeFilters.has('routine') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFilter('routine')}
                          className="flex items-center gap-1 w-full justify-center"
                        >
                          {getTypeIcon('routine')}
                          {getActionTypeLabel('routine')}
                        </Button>
                        <Button
                          variant={activeFilters.has('mission') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFilter('mission')}
                          className="flex items-center gap-1 w-full justify-center"
                        >
                          {getTypeIcon('mission')}
                          {getActionTypeLabel('mission')}
                        </Button>
                        <Button
                          variant={activeFilters.has('reference') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFilter('reference')}
                          className="flex items-center gap-1 w-full justify-center"
                        >
                          {getTypeIcon('reference')}
                          {getActionTypeLabel('reference')}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        참고 타입은 달성율에 포함되지 않습니다
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Empty State */}
        {actions.length === 0 && (
          <div className="relative">
            {/* Mock Preview Background - Action Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.3, y: 0 }}
              transition={{ duration: 0.5 }}
              className="pointer-events-none"
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">2025년 목표 달성</CardTitle>
                    <span className="text-xs text-muted-foreground">3/8 완료</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 blur-[1px]">
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/50"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">매일 30분 운동하기</p>
                      <p className="text-xs text-muted-foreground">루틴 • 매일</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 blur-[1px]">
                    <div className="w-5 h-5 rounded-full bg-primary/50 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">영어 단어 10개 외우기</p>
                      <p className="text-xs text-muted-foreground">루틴 • 매일</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Overlay Card with Empty State Message */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <Card className="w-full max-w-lg shadow-xl bg-background/95 backdrop-blur-sm border-2">
                <CardContent className="text-center py-8 space-y-5">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <ListTodo className="h-8 w-8 text-primary" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xl font-semibold">
                      {totalMandalartCount === 0 ? '아직 실천 항목이 없어요' : '오늘 실천할 항목이 없어요'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {totalMandalartCount === 0 ? (
                        <>
                          만다라트를 만들면<br />
                          매일 실천할 목표를 관리할 수 있어요
                        </>
                      ) : (
                        <>
                          만다라트를 활성화하거나<br />
                          새로운 목표를 추가해보세요
                        </>
                      )}
                    </p>
                  </div>

                  {totalMandalartCount === 0 ? (
                    <>
                      {/* Progress Steps for New Users */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          실천을 시작하는 방법
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-muted-foreground">1</span>
                            </div>
                            <span className="text-muted-foreground">만다라트 만들기</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-muted-foreground">2</span>
                            </div>
                            <span className="text-muted-foreground">실천 항목 자동 생성됨</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-muted-foreground">3</span>
                            </div>
                            <span className="text-muted-foreground">매일 체크하며 실천하기</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => navigate('/mandalart/create')}
                        className="w-full"
                        size="lg"
                      >
                        만다라트 만들기
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Quick Actions for Existing Users */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          다음 중 하나를 선택하세요
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => navigate('/mandalart/list')}
                            className="flex items-start gap-3 text-left bg-background/50 p-3 rounded-md hover:bg-background transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Grid3x3 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">기존 목표 활성화</p>
                              <p className="text-xs text-muted-foreground">만다라트 관리에서 ON/OFF</p>
                            </div>
                          </button>
                          <button
                            onClick={() => navigate('/mandalart/create')}
                            className="flex items-start gap-3 text-left bg-background/50 p-3 rounded-md hover:bg-background transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Plus className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">새 목표 추가</p>
                              <p className="text-xs text-muted-foreground">만다라트 새로 만들기</p>
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => navigate('/mandalart/list')}
                          className="flex-1"
                        >
                          만다라트 관리
                        </Button>
                        <Button
                          onClick={() => navigate('/mandalart/create')}
                          className="flex-1"
                        >
                          새로 만들기
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
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
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">{mandalart.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {mandalartChecked}/{mandalartTotal}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 text-left">핵심 목표: {mandalart.center_goal}</p>
                    </div>
                    {isCollapsed ? (
                      <ChevronRight className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 flex-shrink-0" />
                    )}
                  </button>

                  {/* Actions in this Mandalart */}
                  {!isCollapsed && (
                    <div className="space-y-2 pl-2">
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
                          <div className="p-3">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={action.is_checked}
                                onChange={() => handleToggleCheck(action)}
                                disabled={
                                  checkingActions.has(action.id) ||
                                  action.type === 'reference' ||
                                  !isTodayOrYesterday(selectedDate)
                                }
                                className={`h-5 w-5 rounded border-gray-300 text-primary flex-shrink-0 ${
                                  action.type === 'reference' || !isTodayOrYesterday(selectedDate)
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'cursor-pointer focus:ring-primary'
                                } disabled:cursor-not-allowed`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-sm font-medium ${
                                      action.is_checked
                                        ? 'line-through text-gray-500'
                                        : 'text-gray-900'
                                    }`}
                                  >
                                    {action.title}
                                  </span>
                                  <span className="text-xs text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground">
                                    {action.sub_goal.title}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={(e) => openTypeEditor(action, e)}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer flex-shrink-0"
                                title={`${getActionTypeLabel(action.type)} - 클릭하여 편집`}
                              >
                                {getTypeIcon(action.type)}
                                <span>
                                  {formatTypeDetails(action) || getActionTypeLabel(action.type)}
                                </span>
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
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
              ? (typeof selectedAction.ai_suggestion === 'string'
                  ? JSON.parse(selectedAction.ai_suggestion)
                  : selectedAction.ai_suggestion)
              : undefined
          }}
          onSave={handleTypeSave}
        />
      )}
    </div>
  )
}
