/**
 * XP Service instance for web app
 * Uses dependency injection from @mandaact/shared
 */

import { createXPService, SupabaseClientLike } from '@mandaact/shared'
import { supabase } from './supabase'

// Create XP service instance with web's supabase client
export const xpService = createXPService(supabase as unknown as SupabaseClientLike)

// Re-export types for convenience
export type {
  XPService,
  StreakStats,
  UserLevel,
  UpdateXPResult,
  PerfectDayResult,
  XPMultiplier,
  AwardXPResult
} from '@mandaact/shared'
