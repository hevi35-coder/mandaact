import type { UserLevel, Achievement, UserAchievement } from '@/types'

export const createMockUserLevel = (overrides: Partial<UserLevel> = {}): UserLevel => ({
  id: 'user-level-1',
  user_id: 'test-user-id',
  level: 1,
  total_xp: 100,
  nickname: 'TestUser',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const createMockAchievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  id: 'achievement-1',
  key: 'first_check',
  title: 'First Check',
  description: 'Complete your first action',
  icon: '🎯',
  xp_reward: 50,
  category: 'one_time',
  tier: 'bronze',
  unlock_condition: { type: 'total_checks', value: 1 },
  display_order: 1,
  is_hidden: false,
  max_count: 1,
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockUserAchievement = (
  overrides: Partial<UserAchievement> = {}
): UserAchievement => ({
  id: 'user-achievement-1',
  user_id: 'test-user-id',
  achievement_id: 'achievement-1',
  unlocked_at: new Date().toISOString(),
  count: 1,
  authenticity_score: 1.0,
  is_verified: true,
  achievement: createMockAchievement(),
  ...overrides,
})
