/**
 * XP Service instance for mobile app
 * Uses dependency injection from @mandaact/shared
 */

import { createXPService } from '@mandaact/shared'
import { supabase } from './supabase'

// Create XP service instance with mobile's supabase client
export const xpService = createXPService(supabase as unknown as Parameters<typeof createXPService>[0])

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
