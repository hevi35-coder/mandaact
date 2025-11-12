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

// Gamification types
export interface UserLevel {
  id: string
  user_id: string
  nickname: string
  level: number
  total_xp: number
  last_perfect_day_date?: string | null
  created_at: string
  updated_at: string
}

export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  icon: string
  // Badge System v4 - Updated category types
  category: 'one_time' | 'recurring' | 'limited' | 'hidden' | 'social'
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  xp_reward: number
  unlock_condition: AchievementUnlockCondition
  display_order: number
  created_at: string
  // Badge System v4 - New fields
  is_hidden: boolean
  valid_from?: string | null
  valid_until?: string | null
  anti_cheat_rules?: AntiCheatRules | null
  max_count: number
  is_active?: boolean // v4: Control badge visibility
  // Badge System v5 - New fields
  title_en?: string // English subtitle
  emotional_message?: string // Special message on unlock
  // Badge System v2 (Legacy - may be deprecated)
  hint_level?: 'full' | 'cryptic' | 'hidden'
  badge_type?: 'permanent' | 'monthly' | 'seasonal' | 'event'
  is_repeatable?: boolean
  repeat_xp_multiplier?: number
  active_from?: string
  active_until?: string
  is_featured?: boolean
  // Badge System v3 (Advanced)
  unlocked_metadata?: {
    unlocked_title?: string
    unlocked_description?: string
  }
}

export interface AntiCheatRules {
  minActionsPerMandalart?: number
  minCheckInterval?: number
  maxDailyChecks?: number
  minActionTextLength?: number
  duplicateTextThreshold?: number
}

export interface AchievementUnlockCondition {
  type: 'streak' | 'perfect_day' | 'perfect_week' | 'perfect_month' | 'total_checks' | 'balanced' | 'time_pattern' | 'weekend_completion' | 'monthly_completion' | 'perfect_week_in_month' | 'monthly_streak' | 'perfect_month_count' | 'midnight_checks' | 'balanced_mandalart_week' | 'time_range_checks'
  days?: number
  count?: number
  threshold?: number
  period?: string
  // New fields for advanced badges
  min_mandalarts?: number
  min_days?: number
  start_hour?: number
  end_hour?: number
  // Allow additional properties for extensibility
  [key: string]: unknown
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  achievement?: Achievement
  // Badge System v4 - New fields
  count: number
  authenticity_score: number
  is_verified: boolean
}

export interface AchievementProgress {
  id: string
  user_id: string
  achievement_id: string
  progress_value: number // 0-100 percentage
  progress_current: number // e.g., 5 out of 7 days
  progress_target?: number // e.g., 7 days
  last_updated_at: string
}

export interface AchievementUnlockHistory {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  xp_awarded: number
  repeat_count: number
  unlock_context?: Record<string, unknown>
}

export interface AIReport {
  id: string
  user_id: string
  report_type: 'weekly' | 'monthly' | 'insight' | 'prediction' | 'struggling'
  content: string
  metadata: Record<string, unknown>
  generated_at: string
}

// Stats and analytics types
export interface UserStats {
  totalChecks: number
  currentStreak: number
  longestStreak: number
  lastCheckDate: string | null
  todayCompletion: {
    checked: number
    total: number
    percentage: number
  }
  weekCompletion: {
    checked: number
    total: number
    percentage: number
  }
  monthCompletion: {
    checked: number
    total: number
    percentage: number
  }
}

export interface SubGoalProgress {
  sub_goal_id: string
  sub_goal_title: string
  weeklyCompletion: number
}

export interface PatternInsight {
  type: 'weekday' | 'time_of_day' | 'goal_performance' | 'consistency'
  message: string
  data: Record<string, unknown>
  actionable: boolean
}

// Badge System v4 - Validation logs
export interface BadgeValidationLog {
  id: string
  user_id: string
  badge_key: string
  validation_type: string
  passed: boolean
  details?: Record<string, unknown>
  created_at: string
}
