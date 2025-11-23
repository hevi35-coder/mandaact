import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ReportsPage from '../ReportsPage'

const mockNavigate = vi.fn()

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock authStore with different scenarios
const mockUser = { id: 'test-user-id', email: 'test@example.com' }
let mockAuthStoreUser: any = mockUser

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: mockAuthStoreUser,
  }),
}))

// Mock AIWeeklyReport component
vi.mock('@/components/stats/AIWeeklyReport', () => ({
  AIWeeklyReport: () => <div data-testid="ai-weekly-report">AIWeeklyReport</div>,
}))

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStoreUser = mockUser
  })

  describe('Authentication', () => {
    it('should redirect to /login when user is not logged in', () => {
      mockAuthStoreUser = null
      render(
        <BrowserRouter>
          <ReportsPage />
        </BrowserRouter>
      )

      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should show "로그인이 필요합니다..." when user is not logged in', () => {
      mockAuthStoreUser = null
      render(
        <BrowserRouter>
          <ReportsPage />
        </BrowserRouter>
      )

      expect(screen.getByText('로그인이 필요합니다...')).toBeInTheDocument()
    })
  })

  describe('Page Content', () => {
    it('should render page header (리포트, 맞춤형 분석과 코칭)', () => {
      render(
        <BrowserRouter>
          <ReportsPage />
        </BrowserRouter>
      )

      expect(screen.getByText('리포트')).toBeInTheDocument()
      expect(screen.getByText('맞춤형 분석과 코칭')).toBeInTheDocument()
    })

    it('should render AIWeeklyReport component', () => {
      render(
        <BrowserRouter>
          <ReportsPage />
        </BrowserRouter>
      )

      expect(screen.getByTestId('ai-weekly-report')).toBeInTheDocument()
    })
  })
})
