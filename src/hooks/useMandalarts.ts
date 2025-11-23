import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Mandalart, MandalartWithDetails } from '@/types'

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
 * Hook to fetch a single mandalart
 */
export function useMandalart(id: string | undefined) {
  return useQuery({
    queryKey: mandalartKeys.detail(id || ''),
    queryFn: () => fetchMandalart(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  return {
    ...mandalartData,
    sub_goals: subGoalsWithActions
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to create a mandalart
 */
export function useCreateMandalart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mandalart: Omit<Mandalart, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('mandalarts')
        .insert(mandalart)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate mandalarts list for this user
      queryClient.invalidateQueries({ queryKey: mandalartKeys.list(variables.user_id) })
    },
  })
}

/**
 * Hook to update a mandalart
 */
export function useUpdateMandalart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Mandalart> }) => {
      const { data, error } = await supabase
        .from('mandalarts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidate both list and detail
      queryClient.invalidateQueries({ queryKey: mandalartKeys.list(data.user_id) })
      queryClient.invalidateQueries({ queryKey: mandalartKeys.detail(data.id) })
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
      const { error } = await supabase
        .from('mandalarts')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: mandalartKeys.detail(id) })

      // Snapshot previous value
      const previousMandalart = queryClient.getQueryData(mandalartKeys.detail(id))

      // Optimistically remove from cache
      queryClient.setQueryData(mandalartKeys.detail(id), undefined)

      return { previousMandalart }
    },
    onError: (_err, id, context) => {
      // Rollback on error
      if (context?.previousMandalart) {
        queryClient.setQueryData(mandalartKeys.detail(id), context.previousMandalart)
      }
    },
    onSettled: (_data, _error, id) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: mandalartKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: mandalartKeys.lists() })
    },
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
      return data
    },
    onMutate: async ({ id, isActive }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: mandalartKeys.detail(id) })

      // Snapshot previous value
      const previousMandalart = queryClient.getQueryData<Mandalart>(mandalartKeys.detail(id))

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
