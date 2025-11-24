import { getSupabase } from './supabase'
import { Mandalart, MandalartWithDetails } from '../types'

/**
 * Fetch all mandalarts for a user
 */
export async function fetchMandalarts(userId: string): Promise<Mandalart[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('mandalarts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Fetch a single mandalart with nested sub_goals and actions
 */
export async function fetchMandalartWithDetails(
  id: string
): Promise<MandalartWithDetails> {
  const supabase = getSupabase()

  // Fetch mandalart
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
  const subGoalIds = subGoalsData?.map((sg) => sg.id) || []
  const { data: actionsData, error: actionsError } = await supabase
    .from('actions')
    .select('*')
    .in('sub_goal_id', subGoalIds)
    .order('position')

  if (actionsError) throw actionsError

  // Combine data
  const subGoalsWithActions = (subGoalsData || []).map((sg) => ({
    ...sg,
    actions: (actionsData || [])
      .filter((action) => action.sub_goal_id === sg.id)
      .sort((a, b) => a.position - b.position),
  }))

  return {
    ...mandalartData,
    sub_goals: subGoalsWithActions,
  }
}

/**
 * Toggle mandalart active status
 */
export async function toggleMandalartActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; mandalart?: Mandalart; error?: string }> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('mandalarts')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, mandalart: data }
}
