import { vi } from 'vitest'

// Mock React Router hooks factory
// Import this in individual test files and use vi.mock('react-router-dom', ...) there
export const mockNavigate = vi.fn()
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
}

export const createMockRouter = () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => ({}),
})

// NOTE: Do NOT call vi.mock() here - let individual test files handle their own mocking
