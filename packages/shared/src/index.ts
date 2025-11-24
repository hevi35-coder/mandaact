// Supabase
export { initializeSupabase, getSupabase, isReactNative } from './lib/supabase'

// Stores
export { useAuthStore } from './stores/authStore'

// Types
export type { User, Session } from '@supabase/supabase-js'
export type {
  Mandalart,
  SubGoal,
  Action,
  CheckHistory,
  ActionWithContext
} from './types'

// Timezone utilities
export {
  DEFAULT_TIMEZONE,
  getDayBoundsUTC,
  getCurrentUTC,
  getUserToday,
  formatDateString
} from './lib/timezone'

// Action utilities
export {
  fetchTodayActions,
  checkAction,
  uncheckAction
} from './lib/actions'
