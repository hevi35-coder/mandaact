import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Action, SubGoal, Mandalart, CheckHistory } from '@/types'
import { getDayBoundsUTC, getCurrentUTC } from '@/lib/timezone'
import { getPeriodBounds, getActionPeriodTarget, type RoutineFrequency } from '@mandaact/shared'
import { format } from 'date-fns'

/**
 * Query key factory for actions
 */
export const actionKeys = {
  all: ['actions'] as const,
  lists: () => [...actionKeys.all, 'list'] as const,
  list: (userId: string) => [...actionKeys.lists(), userId] as const,
  todayList: (userId: string, date: string) => [...actionKeys.lists(), userId, 'today', date] as const,
  details: () => [...actionKeys.all, 'detail'] as const,
  detail: (id: string) => [...actionKeys.details(), id] as const,
}

/**
 * Period progress info for display
 */
export interface PeriodProgress {
  checkCount: number
  target: number | null
  periodLabel: string
  isCompleted: boolean
}

/**
 * Action with nested relations and check status
 */
export interface ActionWithContext extends Action {
  sub_goal: SubGoal & {
    mandalart: Mandalart
  }
  is_checked: boolean
  check_id?: string
  period_progress?: PeriodProgress
}

/**
 * Fetch all actions for today
 */
async function fetchTodayActions(
  userId: string,
  selectedDate: Date
): Promise<ActionWithContext[]> {
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
    .eq('sub_goal.mandalart.user_id', userId)

  if (actionsError) throw actionsError

  // Fetch check history for selected date (for is_checked status)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { start: dayStart, end: dayEnd } = getDayBoundsUTC(dateStr)

  const { data: checksData, error: checksError } = await supabase
    .from('check_history')
    .select('*')
    .eq('user_id', userId)
    .gte('checked_at', dayStart)
    .lt('checked_at', dayEnd)

  if (checksError) throw checksError

  // Create a map of checked action IDs for today
  const checkedActionsMap = new Map<string, string>()
  checksData?.forEach((check: CheckHistory) => {
    checkedActionsMap.set(check.action_id, check.id)
  })

  // Calculate period bounds for weekly and monthly
  const weekBounds = getPeriodBounds(selectedDate, 'weekly')
  const monthBounds = getPeriodBounds(selectedDate, 'monthly')

  // Fetch check history for the week (for period progress)
  const { start: weekStart } = getDayBoundsUTC(weekBounds.start)
  const { end: weekEnd } = getDayBoundsUTC(weekBounds.end)

  const { data: weekChecksData, error: weekChecksError } = await supabase
    .from('check_history')
    .select('action_id')
    .eq('user_id', userId)
    .gte('checked_at', weekStart)
    .lt('checked_at', weekEnd)

  if (weekChecksError) throw weekChecksError

  // Fetch check history for the month (for period progress)
  const { start: monthStart } = getDayBoundsUTC(monthBounds.start)
  const { end: monthEnd } = getDayBoundsUTC(monthBounds.end)

  const { data: monthChecksData, error: monthChecksError } = await supabase
    .from('check_history')
    .select('action_id')
    .eq('user_id', userId)
    .gte('checked_at', monthStart)
    .lt('checked_at', monthEnd)

  if (monthChecksError) throw monthChecksError

  // Create maps of check counts per action for each period
  const weekCheckCounts = new Map<string, number>()
  weekChecksData?.forEach((check) => {
    const count = weekCheckCounts.get(check.action_id) || 0
    weekCheckCounts.set(check.action_id, count + 1)
  })

  const monthCheckCounts = new Map<string, number>()
  monthChecksData?.forEach((check) => {
    const count = monthCheckCounts.get(check.action_id) || 0
    monthCheckCounts.set(check.action_id, count + 1)
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
    .map((action) => {
      const frequency = (action.routine_frequency || 'daily') as RoutineFrequency
      const target = getActionPeriodTarget(action)

      // Determine period progress based on frequency
      let periodProgress: PeriodProgress | undefined

      if (action.type !== 'reference') {
        if (frequency === 'weekly' && target !== null) {
          const checkCount = weekCheckCounts.get(action.id) || 0
          periodProgress = {
            checkCount,
            target,
            periodLabel: weekBounds.label,
            isCompleted: checkCount >= target
          }
        } else if (frequency === 'monthly' && target !== null) {
          const checkCount = monthCheckCounts.get(action.id) || 0
          periodProgress = {
            checkCount,
            target,
            periodLabel: monthBounds.label,
            isCompleted: checkCount >= target
          }
        } else if (frequency === 'daily') {
          // For daily, show today's check status
          const isCheckedToday = checkedActionsMap.has(action.id)
          if (isCheckedToday) {
            periodProgress = {
              checkCount: 1,
              target: 1,
              periodLabel: '오늘',
              isCompleted: true
            }
          }
        }
      }

      return {
        ...action,
        sub_goal: action.sub_goal,
        is_checked: checkedActionsMap.has(action.id),
        check_id: checkedActionsMap.get(action.id),
        period_progress: periodProgress
      }
    })

  return actionsWithContext
}

/**
 * Hook to fetch today's actions
 */
export function useTodayActions(userId: string | undefined, selectedDate: Date) {
  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  return useQuery({
    queryKey: actionKeys.todayList(userId || '', dateStr),
    queryFn: () => fetchTodayActions(userId!, selectedDate),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute (shorter for check history)
  })
}

/**
 * Hook to toggle action check
 */
export function useToggleActionCheck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      actionId,
      userId,
      isChecked,
      checkId,
    }: {
      actionId: string
      userId: string
      isChecked: boolean
      checkId?: string
    }) => {
      if (isChecked && checkId) {
        // Uncheck: Delete from check_history
        const { error: deleteError } = await supabase
          .from('check_history')
          .delete()
          .eq('id', checkId)

        if (deleteError) throw deleteError
        return { actionId, isChecked: false }
      } else {
        // Check: Insert into check_history
        const { data: checkData, error: insertError } = await supabase
          .from('check_history')
          .insert({
            action_id: actionId,
            user_id: userId,
            checked_at: getCurrentUTC(),
          })
          .select()
          .single()

        if (insertError) throw insertError
        return { actionId, isChecked: true, checkId: checkData.id }
      }
    },
    onMutate: async ({ actionId, isChecked, userId }) => {
      // Cancel outgoing refetches for today's actions
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      await queryClient.cancelQueries({ queryKey: actionKeys.todayList(userId, dateStr) })

      // Snapshot previous value
      const previousActions = queryClient.getQueryData<ActionWithContext[]>(
        actionKeys.todayList(userId, dateStr)
      )

      // Optimistically update
      if (previousActions) {
        queryClient.setQueryData<ActionWithContext[]>(
          actionKeys.todayList(userId, dateStr),
          previousActions.map((action) =>
            action.id === actionId
              ? { ...action, is_checked: !isChecked }
              : action
          )
        )
      }

      return { previousActions }
    },
    onError: (_err, { userId }, context) => {
      // Rollback on error
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      if (context?.previousActions) {
        queryClient.setQueryData(actionKeys.todayList(userId, dateStr), context.previousActions)
      }
    },
    onSettled: (_data, _error, { userId }) => {
      // Always refetch after error or success
      const dateStr = format(new Date(), 'yyyy-MM-dd')
      queryClient.invalidateQueries({ queryKey: actionKeys.todayList(userId, dateStr) })
    },
  })
}

/**
 * Hook to update action
 */
export function useUpdateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Action> }) => {
      const { data, error } = await supabase
        .from('actions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate all action lists
      queryClient.invalidateQueries({ queryKey: actionKeys.lists() })
    },
  })
}

/**
 * Hook to create action
 */
export function useCreateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (action: Omit<Action, 'id'>) => {
      const { data, error } = await supabase
        .from('actions')
        .insert(action)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate all action lists
      queryClient.invalidateQueries({ queryKey: actionKeys.lists() })
    },
  })
}

/**
 * Hook to delete action
 */
export function useDeleteAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('actions')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      // Invalidate all action lists
      queryClient.invalidateQueries({ queryKey: actionKeys.lists() })
    },
  })
}
