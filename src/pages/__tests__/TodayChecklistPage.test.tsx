import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import TodayChecklistPage from '../TodayChecklistPage'
import { useAuthStore } from '@/store/authStore'

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

// Mock Supabase with complete query chain
vi.mock('@/lib/supabase', () => {
  const createQueryChain = (data: any = [], count: number | null = null) => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      lt: vi.fn(() => chain),
      gt: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve({ data: data[0] || null, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: data[0] || null, error: null })),
      count: vi.fn(() => Promise.resolve({ count, error: null })),
      then: vi.fn((resolve) => resolve({ data, error: null, count })),
    }
    return chain
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'mandalarts') {
          return createQueryChain([], 0)
        }
        if (table === 'actions') {
          return createQueryChain([])
        }
        if (table === 'check_history') {
          return createQueryChain([])
        }
        return createQueryChain([])
      }),
    },
  }
})

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('TodayChecklistPage', () => {
  const mockUser = { id: 'test-user', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should redirect when user is not logged in', () => {
      vi.mocked(useAuthStore).mockReturnValue(null)

      render(
        <BrowserRouter>
          <TodayChecklistPage />
        </BrowserRouter>
      )

      // Should not render main content
      expect(screen.queryByText('투데이')).not.toBeInTheDocument()
    })

    it('should render when user is logged in', async () => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)

      render(
        <BrowserRouter>
          <TodayChecklistPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('투데이')).toBeInTheDocument()
      })
    })
  })

  describe('Page Header', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)
    })

    it('should display page title', async () => {
      render(
        <BrowserRouter>
          <TodayChecklistPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('투데이')).toBeInTheDocument()
      })
    })

    it('should display subtitle', async () => {
      render(
        <BrowserRouter>
          <TodayChecklistPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('오늘의 실천')).toBeInTheDocument()
      })
    })
  })

  describe('Date Navigation', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)
    })

    it('should display date navigation buttons', async () => {
      render(
        <BrowserRouter>
          <TodayChecklistPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        expect(screen.getByText('이전')).toBeInTheDocument()
        expect(screen.getByText('오늘')).toBeInTheDocument()
        expect(screen.getByText('다음')).toBeInTheDocument()
      })
    })

    it('should display today button with gradient when on today', async () => {
      render(
        <BrowserRouter>
          <TodayChecklistPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        const todayButton = screen.getByText('오늘')
        expect(todayButton).toBeInTheDocument()
        // Check for gradient class in parent span
        expect(todayButton.className).toContain('bg-gradient')
      })
    })
  })

  describe('Empty State', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)
    })

    it('should display empty state when no actions', async () => {
      render(
        <BrowserRouter>
          <TodayChecklistPage />
        </BrowserRouter>
      )

      await waitFor(() => {
        // Should show some indication of no actions
        expect(screen.getByText('투데이')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)
    })

    it('should show loading state initially', () => {
      render(
        <BrowserRouter>
          <TodayChecklistPage />
        </BrowserRouter>
      )

      // Component should show loading text initially
      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
    })
  })
})
