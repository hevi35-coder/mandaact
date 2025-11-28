import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import Constants from 'expo-constants'

// Query keys
export const reportKeys = {
  all: ['reports'] as const,
  weekly: (userId: string | undefined) =>
    [...reportKeys.all, 'weekly', userId] as const,
  diagnosis: (userId: string | undefined) =>
    [...reportKeys.all, 'diagnosis', userId] as const,
  history: (userId: string | undefined) =>
    [...reportKeys.all, 'history', userId] as const,
}

// Types - Match ai_reports table structure
export interface AIReport {
  id: string
  user_id: string
  report_type: 'weekly' | 'diagnosis'
  content: string
  metadata: Record<string, unknown>
  generated_at: string
}

// Legacy interface for backwards compatibility with ReportsScreen
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
  mandalart_id?: string
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

// Get Supabase URL from environment
function getSupabaseUrl(): string {
  const extra = Constants.expoConfig?.extra
  return extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
}

// Transform AIReport to WeeklyReport for backwards compatibility
function transformToWeeklyReport(report: AIReport): WeeklyReport {
  // Extract week dates: last 7 days from generated_at (including generated date)
  const generatedDate = new Date(report.generated_at)
  const weekEnd = new Date(generatedDate) // End date is the generated date
  const weekStart = new Date(generatedDate)
  weekStart.setDate(weekStart.getDate() - 6) // 7 days including end date

  // Extract summary from content (first line or first paragraph)
  const lines = report.content.split('\n').filter(l => l.trim())
  const summary = lines[0]?.replace(/^#+\s*/, '') || '주간 실천 리포트'

  return {
    id: report.id,
    user_id: report.user_id,
    week_start: weekStart.toISOString().split('T')[0],
    week_end: weekEnd.toISOString().split('T')[0],
    report_content: report.content,
    summary,
    created_at: report.generated_at,
  }
}

// Transform AIReport to GoalDiagnosis for backwards compatibility
function transformToGoalDiagnosis(report: AIReport): GoalDiagnosis {
  // Try to extract SMART scores from content or metadata
  const metadata = report.metadata || {}
  const smartScores = (metadata.smart_scores as GoalDiagnosis['smart_scores']) || {
    specific: 70,
    measurable: 70,
    achievable: 70,
    relevant: 70,
    timeBound: 70,
  }

  return {
    id: report.id,
    mandalart_id: metadata.mandalart_id as string | undefined,
    diagnosis_content: report.content,
    smart_scores: smartScores,
    created_at: report.generated_at,
  }
}

// Fetch weekly report (latest)
export function useWeeklyReport(userId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.weekly(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', userId!)
        .eq('report_type', 'weekly')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return transformToWeeklyReport(data as AIReport)
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Generate weekly report using generate-report edge function
export function useGenerateWeeklyReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId }: { userId: string; weekStart?: string }) => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('No active session')
      }

      const supabaseUrl = getSupabaseUrl()
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: 'weekly',
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Weekly report generation failed:', response.status, errorData)
        throw new Error(errorData.error || `Failed to generate report: ${response.status}`)
      }

      const result = await response.json()

      // Handle wrapped response format: { success: true, data: { report: ... } }
      const report = result.data?.report || result.report

      // Validate report content
      if (!report || !report.content) {
        console.error('Invalid report response:', result)
        throw new Error('리포트 내용이 비어있습니다.')
      }

      return transformToWeeklyReport(report as AIReport)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: reportKeys.weekly(variables.userId),
      })
      queryClient.invalidateQueries({
        queryKey: reportKeys.history(variables.userId),
      })
    },
  })
}

// Fetch goal diagnosis (latest)
export function useGoalDiagnosis(mandalartId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.diagnosis(mandalartId),
    queryFn: async () => {
      // Get user ID first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user')

      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('report_type', 'diagnosis')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return transformToGoalDiagnosis(data as AIReport)
    },
    enabled: !!mandalartId,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

// Generate goal diagnosis using generate-report edge function
export function useGenerateGoalDiagnosis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mandalartId: string) => {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('No active session')
      }

      const supabaseUrl = getSupabaseUrl()
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: 'diagnosis',
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Diagnosis generation failed:', response.status, errorData)
        throw new Error(errorData.error || `Failed to generate diagnosis: ${response.status}`)
      }

      const result = await response.json()
      // Handle wrapped response format
      const report = result.data?.report || result.report
      return transformToGoalDiagnosis(report as AIReport)
    },
    onSuccess: (_data, mandalartId) => {
      queryClient.invalidateQueries({
        queryKey: reportKeys.diagnosis(mandalartId),
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
        .from('ai_reports')
        .select('id, report_type, content, metadata, generated_at')
        .eq('user_id', userId!)
        .eq('report_type', 'weekly')
        .order('generated_at', { ascending: false })
        .limit(12) // Last 12 reports

      if (error) throw error

      return (data || []).map((report) => {
        const transformed = transformToWeeklyReport(report as AIReport)
        return {
          id: transformed.id,
          week_start: transformed.week_start,
          week_end: transformed.week_end,
          report_content: transformed.report_content,
          summary: transformed.summary,
          created_at: transformed.created_at,
        }
      })
    },
    enabled: !!userId,
  })
}
