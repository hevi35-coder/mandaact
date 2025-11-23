import { vi } from 'vitest'

// Mock auth store factory
// Import this in individual test files and use vi.mock('@/store/authStore', ...) there
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

// NOTE: Do NOT call vi.mock() here - let individual test files handle their own mocking
