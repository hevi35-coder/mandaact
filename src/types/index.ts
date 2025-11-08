export interface Mandalart {
  id: string
  user_id: string
  title: string
  center_goal: string
  input_method: 'image' | 'manual'
  image_url?: string
  raw_ocr_data?: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
  sub_goals?: SubGoal[]
}

export interface SubGoal {
  id: string
  mandalart_id: string
  position: number // 1-8
  title: string
  created_at: string
  actions?: Action[]
}

export interface Action {
  id: string
  sub_goal_id: string
  position: number // 1-8
  title: string
  created_at: string

  // Type system
  type: 'routine' | 'mission' | 'reference'

  // Routine settings
  routine_frequency?: 'daily' | 'weekly' | 'monthly'
  routine_weekdays?: number[] // [0,1,2,3,4] = Sun-Thu
  routine_count_per_period?: number // Weekly: 3 times, Monthly: 2 times

  // Mission settings
  mission_completion_type?: 'once' | 'periodic'
  mission_period_cycle?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  mission_current_period_start?: string
  mission_current_period_end?: string
  mission_status?: 'active' | 'completed' | 'failed'

  // AI suggestion record
  ai_suggestion?: {
    type: string
    confidence: string
    reason: string
  }
}

export interface CheckHistory {
  id: string
  action_id: string
  user_id: string
  checked_at: string
  note?: string
}

export interface MissionHistory {
  id: string
  action_id: string
  period_start: string
  period_end: string
  status: 'completed' | 'failed'
  completed_at?: string
  created_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title?: string
  started_at: string
  last_message_at: string
  is_active: boolean
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  context_data?: {
    center_goal?: string
    check_rate?: number
    total_checks?: number
    low_performance_areas?: string[]
  }
  created_at: string
}

export interface CoachingContext {
  user_id: string
  mandalart?: {
    center_goal: string
    sub_goals: string[]
  }
  recent_activity?: {
    last_7_days_check_rate: number
    total_checks_this_week: number
    low_performance_areas: string[]
    streak_days: number
  }
}

// Grid data structure for MandalartGrid component
export interface MandalartGridData {
  center_goal: string
  sub_goals: Array<{
    position: number // 1-8
    title: string
    actions: Array<{
      position: number // 1-8
      title: string
      type?: 'routine' | 'mission' | 'reference'
    }>
  }>
}

// For DetailPage compatibility
export interface MandalartWithDetails extends Mandalart {
  sub_goals: (SubGoal & { actions: Action[] })[]
}
