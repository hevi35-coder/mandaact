import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Query keys
export const reportKeys = {
  all: ['reports'] as const,
  weekly: (userId: string | undefined, weekStart?: string) =>
    [...reportKeys.all, 'weekly', userId, weekStart] as const,
  goalDiagnosis: (mandalartId: string | undefined) =>
    [...reportKeys.all, 'goal-diagnosis', mandalartId] as const,
  history: (userId: string | undefined) =>
    [...reportKeys.all, 'history', userId] as const,
}

// Types
export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_end: string
  report_content: string
  summary: string
  created_at: string
}

export interface GoalDiagnosis {
  id: string
  mandalart_id: string
  diagnosis_content: string
  smart_scores: {
    specific: number
    measurable: number
    achievable: number
    relevant: number
    timeBound: number
  }
  created_at: string
}

// Get week start date (Monday)
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

// Fetch weekly report
export function useWeeklyReport(userId: string | undefined, weekStart?: string) {
  const targetWeek = weekStart || getWeekStart()

  return useQuery({
    queryKey: reportKeys.weekly(userId, targetWeek),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', userId!)
        .eq('week_start', targetWeek)
        .maybeSingle()

      if (error) throw error
      return data as WeeklyReport | null
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Generate weekly report
export function useGenerateWeeklyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, weekStart }: { userId: string; weekStart?: string }) => {
      const targetWeek = weekStart || getWeekStart()

      const { data, error } = await supabase.functions.invoke('generate-weekly-report', {
        body: { user_id: userId, week_start: targetWeek },
      })

      if (error) throw error
      return data as WeeklyReport
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: reportKeys.weekly(variables.userId, variables.weekStart),
      })
      queryClient.invalidateQueries({
        queryKey: reportKeys.history(variables.userId),
      })
    },
  })
}

// Fetch goal diagnosis
export function useGoalDiagnosis(mandalartId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.goalDiagnosis(mandalartId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_diagnoses')
        .select('*')
        .eq('mandalart_id', mandalartId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data as GoalDiagnosis | null
    },
    enabled: !!mandalartId,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

// Generate goal diagnosis
export function useGenerateGoalDiagnosis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mandalartId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-goal-diagnosis', {
        body: { mandalart_id: mandalartId },
      })

      if (error) throw error
      return data as GoalDiagnosis
    },
    onSuccess: (data, mandalartId) => {
      queryClient.invalidateQueries({
        queryKey: reportKeys.goalDiagnosis(mandalartId),
      })
    },
  })
}

// Fetch report history
export function useReportHistory(userId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.history(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('id, week_start, week_end, summary, created_at')
        .eq('user_id', userId!)
        .order('week_start', { ascending: false })
        .limit(12) // Last 12 weeks

      if (error) throw error
      return data as Pick<WeeklyReport, 'id' | 'week_start' | 'week_end' | 'summary' | 'created_at'>[]
    },
    enabled: !!userId,
  })
}
