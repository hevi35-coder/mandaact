import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { getDayBoundsUTC, getPeriodBounds, getMissionPeriodBounds, getActionPeriodTarget, getCurrentUTC, type RoutineFrequency } from '@mandaact/shared'
import type { Action, SubGoal, Mandalart, CheckHistory } from '@mandaact/shared'
import { format } from 'date-fns'

/**
 * Query key factory for actions
 */
export const actionKeys = {
  all: ['actions'] as const,
  lists: () => [...actionKeys.all, 'list'] as const,
  list: (userId: string) => [...actionKeys.lists(), userId] as const,
  todayList: (userId: string, date: string) =>
    [...actionKeys.lists(), userId, 'today', date] as const,
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
 * Fetch all actions for a specific date
 */
async function fetchTodayActions(
  userId: string,
  selectedDate: Date
): Promise<ActionWithContext[]> {
  // Fetch all actions with sub_goals and mandalarts
  const { data: actionsData, error: actionsError } = await supabase
    .from('actions')
    .select(
      `
      *,
      sub_goal:sub_goals (
        *,
        mandalart:mandalarts (*)
      )
    `
    )
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

  // Calculate period bounds for weekly, monthly, quarterly, yearly
  const weekBounds = getPeriodBounds(selectedDate, 'weekly')
  const monthBounds = getPeriodBounds(selectedDate, 'monthly')
  const quarterBounds = getMissionPeriodBounds(selectedDate, 'quarterly')
  const yearBounds = getMissionPeriodBounds(selectedDate, 'yearly')

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

  // Fetch check history for the quarter (for period progress)
  const { start: quarterStart } = getDayBoundsUTC(quarterBounds.start)
  const { end: quarterEnd } = getDayBoundsUTC(quarterBounds.end)

  const { data: quarterChecksData, error: quarterChecksError } = await supabase
    .from('check_history')
    .select('action_id')
    .eq('user_id', userId)
    .gte('checked_at', quarterStart)
    .lt('checked_at', quarterEnd)

  if (quarterChecksError) throw quarterChecksError

  // Fetch check history for the year (for period progress)
  const { start: yearStart } = getDayBoundsUTC(yearBounds.start)
  const { end: yearEnd } = getDayBoundsUTC(yearBounds.end)

  const { data: yearChecksData, error: yearChecksError } = await supabase
    .from('check_history')
    .select('action_id')
    .eq('user_id', userId)
    .gte('checked_at', yearStart)
    .lt('checked_at', yearEnd)

  if (yearChecksError) throw yearChecksError

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

  const quarterCheckCounts = new Map<string, number>()
  quarterChecksData?.forEach((check) => {
    const count = quarterCheckCounts.get(check.action_id) || 0
    quarterCheckCounts.set(check.action_id, count + 1)
  })

  const yearCheckCounts = new Map<string, number>()
  yearChecksData?.forEach((check) => {
    const count = yearCheckCounts.get(check.action_id) || 0
    yearCheckCounts.set(check.action_id, count + 1)
  })

  // Combine data
  const actionsWithContext: ActionWithContext[] = (actionsData || [])
    .filter(
      (
        action
      ): action is typeof action & { sub_goal: { mandalart: Mandalart } } =>
        action.sub_goal?.mandalart != null
    )
    .filter(
      (action) =>
        // Only show actions from active mandalarts
        action.sub_goal.mandalart.is_active !== false
    )
    .map((action) => {
      const target = getActionPeriodTarget(action)

      // Determine period progress based on type and frequency
      let periodProgress: PeriodProgress | undefined

      if (action.type !== 'reference') {
        // Handle mission type with periodic completion
        if (action.type === 'mission' && action.mission_completion_type === 'periodic') {
          const missionCycle = action.mission_period_cycle || 'monthly'
          if (missionCycle === 'weekly') {
            const checkCount = weekCheckCounts.get(action.id) || 0
            periodProgress = {
              checkCount,
              target: target ?? 1,
              periodLabel: weekBounds.label,
              isCompleted: checkCount >= (target ?? 1)
            }
          } else if (missionCycle === 'monthly') {
            const checkCount = monthCheckCounts.get(action.id) || 0
            periodProgress = {
              checkCount,
              target: target ?? 1,
              periodLabel: monthBounds.label,
              isCompleted: checkCount >= (target ?? 1)
            }
          } else if (missionCycle === 'daily') {
            const isCheckedToday = checkedActionsMap.has(action.id)
            if (isCheckedToday) {
              periodProgress = {
                checkCount: 1,
                target: 1,
                periodLabel: '오늘',
                isCompleted: true
              }
            }
          } else if (missionCycle === 'quarterly') {
            const checkCount = quarterCheckCounts.get(action.id) || 0
            periodProgress = {
              checkCount,
              target: target ?? 1,
              periodLabel: quarterBounds.label,
              isCompleted: checkCount >= (target ?? 1)
            }
          } else if (missionCycle === 'yearly') {
            const checkCount = yearCheckCounts.get(action.id) || 0
            periodProgress = {
              checkCount,
              target: target ?? 1,
              periodLabel: yearBounds.label,
              isCompleted: checkCount >= (target ?? 1)
            }
          }
        }
        // Handle routine type
        else if (action.type === 'routine') {
          const frequency = (action.routine_frequency || 'daily') as RoutineFrequency
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
        // Handle one-time missions (mission_completion_type === 'once')
        else if (action.type === 'mission') {
          // No period progress for one-time missions
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
export function useTodayActions(
  userId: string | undefined,
  selectedDate: Date
) {
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
      selectedDate: _selectedDate,
      // For mission status update
      actionType,
      missionCompletionType,
    }: {
      actionId: string
      userId: string
      isChecked: boolean
      checkId?: string
      selectedDate: Date
      actionType?: string
      missionCompletionType?: string
    }) => {
      if (isChecked && checkId) {
        // Uncheck: Delete from check_history
        const { error: deleteError } = await supabase
          .from('check_history')
          .delete()
          .eq('id', checkId)

        if (deleteError) {
          throw new Error(`Delete error: ${deleteError.message || deleteError.code || JSON.stringify(deleteError)}`)
        }

        // If mission (once type): Reset mission_status to 'active'
        if (actionType === 'mission' && missionCompletionType === 'once') {
          const { error: updateError } = await supabase
            .from('actions')
            .update({ mission_status: 'active' })
            .eq('id', actionId)

          if (updateError) {
            console.warn('Failed to update mission_status:', updateError)
          }
        }

        return { actionId, isChecked: false }
      } else {
        // Check: Insert into check_history with current UTC time (same as web app)
        const { data: checkData, error: insertError } = await supabase
          .from('check_history')
          .insert({
            action_id: actionId,
            user_id: userId,
            checked_at: getCurrentUTC(),
          })
          .select()
          .single()

        if (insertError) {
          throw new Error(`Insert error: ${insertError.message || insertError.code || JSON.stringify(insertError)}`)
        }

        // If mission (once type): Update mission_status to 'completed'
        if (actionType === 'mission' && missionCompletionType === 'once') {
          const { error: updateError } = await supabase
            .from('actions')
            .update({ mission_status: 'completed' })
            .eq('id', actionId)

          if (updateError) {
            console.warn('Failed to update mission_status:', updateError)
          }
        }

        return { actionId, isChecked: true, checkId: checkData.id }
      }
    },
    onMutate: async ({ actionId, isChecked, userId, selectedDate }) => {
      // Cancel outgoing refetches for the selected date's actions
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      await queryClient.cancelQueries({
        queryKey: actionKeys.todayList(userId, dateStr),
      })

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

      return { previousActions, dateStr }
    },
    onError: (_err, { userId, selectedDate }, context) => {
      // Rollback on error
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      if (context?.previousActions) {
        queryClient.setQueryData(
          actionKeys.todayList(userId, dateStr),
          context.previousActions
        )
      }
    },
    onSettled: (_data, _error, { userId, selectedDate, actionType, missionCompletionType }) => {
      // Always refetch after error or success
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      queryClient.invalidateQueries({
        queryKey: actionKeys.todayList(userId, dateStr),
      })

      // For mission (once type), also invalidate all action lists
      // because mission_status change affects filtering on all dates
      if (actionType === 'mission' && missionCompletionType === 'once') {
        queryClient.invalidateQueries({
          queryKey: actionKeys.lists(),
        })
      }
    },
  })
}

/**
 * Hook to update action
 */
export function useUpdateAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Action>
    }) => {
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
      // Also invalidate mandalart details to reflect action changes
      queryClient.invalidateQueries({ queryKey: ['mandalarts', 'detail'] })
    },
  })
}
