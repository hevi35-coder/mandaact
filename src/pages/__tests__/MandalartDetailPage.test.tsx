import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MandalartDetailPage from '../MandalartDetailPage'

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  const mandalartData = {
    id: 'test-mandalart-id',
    title: '건강한 삶 만다라트',
    center_goal: '건강한 삶',
    created_at: '2025-11-23T00:00:00Z',
    is_active: true,
    user_id: 'test-user-id',
  }

  const subGoalsData = [
    {
      id: 'sub-1',
      title: '운동',
      position: 1,
      mandalart_id: 'test-mandalart-id',
    },
    {
      id: 'sub-2',
      title: '식습관',
      position: 2,
      mandalart_id: 'test-mandalart-id',
    }
  ]

  const actionsData = [
    {
      id: 'action-1',
      title: '아침 조깅',
      type: 'routine',
      position: 1,
      sub_goal_id: 'sub-1',
      frequency: 'daily',
      weekdays: [1, 2, 3, 4, 5],
      is_completed: false
    },
    {
      id: 'action-2',
      title: '저녁 스트레칭',
      type: 'routine',
      position: 2,
      sub_goal_id: 'sub-1',
      frequency: 'daily',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      is_completed: false
    },
    {
      id: 'action-3',
      title: '아침식사',
      type: 'routine',
      position: 1,
      sub_goal_id: 'sub-2',
      frequency: 'daily',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      is_completed: false
    }
  ]

  const createQueryChain = (table: string) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      in: vi.fn(() => chain),
      single: vi.fn(() => {
        if (table === 'mandalarts') {
          return Promise.resolve({ data: mandalartData, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      }),
      then: vi.fn((resolve) => {
        if (table === 'sub_goals') {
          return resolve({ data: subGoalsData, error: null })
        }
        if (table === 'actions') {
          return resolve({ data: actionsData, error: null })
        }
        if (table === 'check_history') {
          return resolve({ count: 0, error: null })
        }
        return resolve({ data: [], error: null })
      }),
    }
    return chain
  }

  return {
    supabase: {
      from: vi.fn((table: string) => createQueryChain(table)),
    },
  }
})

// Mock modern-screenshot
vi.mock('modern-screenshot', () => ({
  domToPng: vi.fn(() => Promise.resolve('data:image/png;base64,mock'))
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock authStore
vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' }
  })
}))

// Mock notification utils to avoid toast issues
vi.mock('@/lib/notificationUtils', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showInfo: vi.fn(),
}))

// Mock timezone util
vi.mock('@/lib/timezone', () => ({
  getUserToday: vi.fn(() => '2025-11-23')
}))

describe('MandalartDetailPage', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/mandalart/test-mandalart-id']}>
        <Routes>
          <Route path="/mandalart/:id" element={<MandalartDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state initially', () => {
    renderWithRouter()
    expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  })

  it('should render mandalart title and center goal after loading', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('건강한 삶 만다라트')).toBeInTheDocument()
      // "건강한 삶" appears multiple times (header subtitle + hidden download grid + mobile view)
      const centerGoalElements = screen.getAllByText('건강한 삶')
      expect(centerGoalElements.length).toBeGreaterThan(0)
      expect(centerGoalElements[0]).toBeInTheDocument()
    })
  })

  it('should render action buttons (목록, 다운로드, 삭제)', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('만다라트 목록')).toBeInTheDocument()
      expect(screen.getByText('다운로드')).toBeInTheDocument()
      expect(screen.getByText('삭제')).toBeInTheDocument()
    })
  })

  it('should render download button with gradient text', async () => {
    renderWithRouter()

    await waitFor(() => {
      const downloadButton = screen.getByText('다운로드')
      expect(downloadButton).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-purple-600', 'bg-clip-text', 'text-transparent')
    })
  })

  it('should render instructions section', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('사용 방법')).toBeInTheDocument()
      expect(screen.getByText(/각 영역을 탭하여 상세보기 및 수정이 가능합니다/)).toBeInTheDocument()
    })
  })

  it('should render type icons (루틴, 미션, 참고)', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('루틴')).toBeInTheDocument()
      expect(screen.getByText('미션')).toBeInTheDocument()
      expect(screen.getByText('참고')).toBeInTheDocument()
    })
  })
})
