import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Mandalart, MandalartWithDetails, SubGoal, Action } from '@mandaact/shared'

/**
 * Query key factory for mandalarts
 */
export const mandalartKeys = {
  all: ['mandalarts'] as const,
  lists: () => [...mandalartKeys.all, 'list'] as const,
  list: (userId: string) => [...mandalartKeys.lists(), userId] as const,
  details: () => [...mandalartKeys.all, 'detail'] as const,
  detail: (id: string) => [...mandalartKeys.details(), id] as const,
}

/**
 * Fetch all mandalarts for a user
 */
async function fetchMandalarts(userId: string): Promise<Mandalart[]> {
  const { data, error } = await supabase
    .from('mandalarts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Fetch a single mandalart by ID
 */
async function fetchMandalart(id: string): Promise<Mandalart> {
  const { data, error } = await supabase
    .from('mandalarts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

/**
 * Hook to fetch all mandalarts for a user
 */
export function useMandalarts(userId: string | undefined) {
  return useQuery({
    queryKey: mandalartKeys.list(userId || ''),
    queryFn: () => fetchMandalarts(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch active mandalarts for a user
 */
export function useActiveMandalarts(userId: string | undefined) {
  return useQuery({
    queryKey: [...mandalartKeys.list(userId || ''), 'active'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mandalarts')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch a single mandalart
 */
export function useMandalart(id: string | undefined) {
  return useQuery({
    queryKey: mandalartKeys.detail(id || ''),
    queryFn: () => fetchMandalart(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data for fast UX
    refetchOnMount: 'always', // Always refetch in background when component mounts
  })
}

/**
 * Fetch a single mandalart with sub_goals and actions
 */
async function fetchMandalartWithDetails(id: string): Promise<MandalartWithDetails> {
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
  const subGoalIds = subGoalsData?.map((sg: SubGoal) => sg.id) || []
  const { data: actionsData, error: actionsError } = await supabase
    .from('actions')
    .select('*')
    .in('sub_goal_id', subGoalIds)
    .order('position')

  if (actionsError) throw actionsError

  // Combine data
  const subGoalsWithActions = (subGoalsData || []).map((sg: SubGoal) => ({
    ...sg,
    actions: ((actionsData || []) as Action[])
      .filter((action) => action.sub_goal_id === sg.id)
      .sort((a, b) => a.position - b.position),
  }))

  return {
    ...mandalartData,
    sub_goals: subGoalsWithActions,
    // v17.0: Include coaching_session_id for coaching history navigation
    coaching_session_id: mandalartData.coaching_session_id || null,
  }
}

/**
 * Hook to fetch a single mandalart with nested sub_goals and actions
 */
export function useMandalartWithDetails(id: string | undefined) {
  return useQuery({
    queryKey: mandalartKeys.detail(id || ''),
    queryFn: () => fetchMandalartWithDetails(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes - show cached data for fast UX
    refetchOnMount: 'always', // Always refetch in background when component mounts
  })
}

/**
 * Hook to toggle mandalart active status
 */
export function useToggleMandalartActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('mandalarts')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Mandalart
    },
    onMutate: async ({ id, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: mandalartKeys.detail(id) })

      // Snapshot previous value
      const previousMandalart = queryClient.getQueryData<Mandalart>(
        mandalartKeys.detail(id)
      )

      // Optimistically update
      if (previousMandalart) {
        queryClient.setQueryData(mandalartKeys.detail(id), {
          ...previousMandalart,
          is_active: isActive,
        })
      }

      return { previousMandalart }
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousMandalart) {
        queryClient.setQueryData(mandalartKeys.detail(id), context.previousMandalart)
      }
    },
    onSuccess: (data) => {
      // Invalidate list to update UI
      queryClient.invalidateQueries({ queryKey: mandalartKeys.list(data.user_id) })
    },
  })
}

/**
 * Hook to delete a mandalart
 */
export function useDeleteMandalart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mandalarts').delete().eq('id', id)

      if (error) throw error
      return id
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: mandalartKeys.lists() })
    },
  })
}
