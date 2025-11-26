// Shared constants used across web and mobile

export const APP_NAME = 'MandaAct'
export const APP_VERSION = '1.0.0'

// Action types
export const ACTION_TYPES = {
  ROUTINE: 'routine',
  MISSION: 'mission',
  REFERENCE: 'reference',
} as const

// Time-related constants
export const TIMEZONE = 'Asia/Seoul'

// Grid dimensions
export const MANDALART_GRID_SIZE = 9
export const SUBGOAL_COUNT = 8
export const ACTIONS_PER_SUBGOAL = 8

// XP constants
export const BASE_XP_PER_CHECK = 10
export const MAX_DAILY_CHECKS_PER_ACTION = 3

// Level thresholds (for reference, actual calculation in lib)
export const LEVEL_THRESHOLDS = {
  BEGINNER: 100,
  INTERMEDIATE: 500,
  ADVANCED: 2000,
} as const
