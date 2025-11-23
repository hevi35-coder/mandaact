import { vi } from 'vitest'

// Mock auth store
export const createMockAuthStore = (overrides = {}) => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  initialize: vi.fn(),
})

// Mock auth store module
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(() => createMockAuthStore()),
}))
