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
  mandalart?: Mandalart
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

/**
 * Action with nested relations and check status
 */
export interface ActionWithContext extends Action {
  sub_goal: SubGoal & {
    mandalart: Mandalart
  }
  is_checked: boolean
  check_id?: string
}

/**
 * Mandalart with nested sub_goals and actions
 */
export interface MandalartWithDetails extends Mandalart {
  sub_goals: (SubGoal & {
    actions: Action[]
  })[]
}
