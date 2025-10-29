export interface Mandalart {
  id: string
  user_id: string
  title: string
  center_goal: string
  input_method: 'image' | 'manual'
  image_url?: string
  raw_ocr_data?: Record<string, unknown>
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
}

export interface CheckHistory {
  id: string
  action_id: string
  user_id: string
  checked_at: string
  note?: string
}

export interface User {
  id: string
  email: string
  created_at: string
}
