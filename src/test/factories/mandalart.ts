import type { Mandalart, SubGoal, Action } from '@/types'

export const createMockMandalart = (overrides: Partial<Mandalart> = {}): Mandalart => ({
  id: 'mandalart-1',
  user_id: 'test-user-id',
  title: 'Test Mandalart',
  center_goal: 'Test Goal',
  input_method: 'manual',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const createMockSubGoal = (overrides: Partial<SubGoal> = {}): SubGoal => ({
  id: 'subgoal-1',
  mandalart_id: 'mandalart-1',
  title: 'Test SubGoal',
  position: 1,
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockAction = (overrides: Partial<Action> = {}): Action => ({
  id: 'action-1',
  sub_goal_id: 'subgoal-1',
  title: 'Test Action',
  type: 'routine',
  routine_frequency: 'daily',
  position: 1,
  created_at: new Date().toISOString(),
  ...overrides,
})
