/**
 * Badge Service instance for mobile app
 * Uses dependency injection from @mandaact/shared
 */

import { createBadgeService } from '@mandaact/shared'
import { supabase } from './supabase'

// Create Badge service instance with mobile's supabase client
export const badgeService = createBadgeService(supabase as unknown as Parameters<typeof createBadgeService>[0])

// Re-export types for convenience
export type {
  BadgeService,
  BadgeProgress,
  BadgeEvaluationResult,
  Achievement,
  AchievementUnlockCondition
} from '@mandaact/shared'
