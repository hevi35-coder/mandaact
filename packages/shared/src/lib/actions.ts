import { getSupabase } from './supabase'
import { ActionWithContext, CheckHistory } from '../types'
import { getDayBoundsUTC, formatDateString } from './timezone'

/**
 * Fetch all actions for a specific date
 */
export async function fetchTodayActions(
  userId: string,
  selectedDate: Date
): Promise<ActionWithContext[]> {
  const supabase = getSupabase()

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

  // Fetch check history for selected date
  const dateStr = formatDateString(selectedDate)
  const { start: dayStart, end: dayEnd } = getDayBoundsUTC(dateStr)

  const { data: checksData, error: checksError } = await supabase
    .from('check_history')
    .select('*')
    .eq('user_id', userId)
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
    .filter((action): action is typeof action & { sub_goal: { mandalart: any } } =>
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
      check_id: checkedActionsMap.get(action.id),
    }))

  return actionsWithContext
}

/**
 * Check an action for a specific date
 */
export async function checkAction(
  userId: string,
  actionId: string,
  checkedAt: string = new Date().toISOString()
): Promise<{ success: boolean; checkId?: string; error?: string }> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('check_history')
    .insert({
      action_id: actionId,
      user_id: userId,
      checked_at: checkedAt,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, checkId: data.id }
}

/**
 * Uncheck an action (delete check history)
 */
export async function uncheckAction(
  checkId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('check_history')
    .delete()
    .eq('id', checkId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
