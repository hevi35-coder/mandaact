import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '../HomePage'

const mockNavigate = vi.fn()

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock Supabase
let mockMandalarts: any[] = [{ id: 'mandalart-1' }]

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({
        data: mockMandalarts,
        error: null,
      })),
    })),
  },
}))

// Mock authStore with different scenarios
const mockUser = { id: 'test-user-id', email: 'test@example.com' }
const mockSignOut = vi.fn()
let mockAuthStoreUser: any = mockUser

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: mockAuthStoreUser,
    signOut: mockSignOut,
  }),
}))

// Mock UserProfileCard and StreakHero components
vi.mock('@/components/stats/UserProfileCard', () => ({
  UserProfileCard: () => <div data-testid="user-profile-card">UserProfileCard</div>,
}))

vi.mock('@/components/stats/StreakHero', () => ({
  StreakHero: () => <div data-testid="streak-hero">StreakHero</div>,
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStoreUser = mockUser
    localStorage.clear()

    // Default: user has mandalarts
    mockMandalarts = [{ id: 'mandalart-1' }]
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Authentication', () => {
    it('should redirect to /login when user is not logged in', () => {
      mockAuthStoreUser = null
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('should show "로그인이 필요합니다..." when user is not logged in', () => {
      mockAuthStoreUser = null
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      expect(screen.getByText('로그인이 필요합니다...')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading state while checking first-time user status', () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
    })
  })

  describe('Page Content', () => {
    it('should render page header (홈, 성장 대시보드)', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('홈')).toBeInTheDocument()
        expect(screen.getByText('성장 대시보드')).toBeInTheDocument()
      })
    })

    it('should render UserProfileCard component', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user-profile-card')).toBeInTheDocument()
      })
    })

    it('should render StreakHero component', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('streak-hero')).toBeInTheDocument()
      })
    })

    it('should render tutorial button with gradient text', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      await waitFor(() => {
        const tutorialButton = screen.getByText('튜토리얼')
        expect(tutorialButton).toBeInTheDocument()
        expect(tutorialButton).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-purple-600')
      })
    })

    it('should render logout button', async () => {
      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('로그아웃')).toBeInTheDocument()
      })
    })
  })

  describe('First-time User Redirect', () => {
    it('should redirect to /tutorial when tutorial not completed and no mandalarts', async () => {
      // Mock: no tutorial completed
      localStorage.removeItem('tutorial_completed')

      // Mock: no mandalarts
      mockMandalarts = []

      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tutorial', { replace: true })
      })
    })

    it('should NOT redirect when tutorial is completed', async () => {
      // Mock: tutorial completed
      localStorage.setItem('tutorial_completed', 'true')

      // Mock: no mandalarts
      mockMandalarts = []

      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('홈')).toBeInTheDocument()
      })

      // Should NOT redirect to tutorial
      expect(mockNavigate).not.toHaveBeenCalledWith('/tutorial', { replace: true })
    })

    it('should NOT redirect when user has mandalarts', async () => {
      // Mock: no tutorial completed
      localStorage.removeItem('tutorial_completed')

      // Mock: has mandalarts (default mock already set in beforeEach)
      mockMandalarts = [{ id: 'mandalart-1' }]

      render(
        <BrowserRouter>
          <HomePage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('홈')).toBeInTheDocument()
      })

      // Should NOT redirect to tutorial
      expect(mockNavigate).not.toHaveBeenCalledWith('/tutorial', { replace: true })
    })
  })
})
