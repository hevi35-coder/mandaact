import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserProfileCard } from '../UserProfileCard'
import { renderWithProviders } from '@/test/utils/render'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import * as stats from '@/lib/stats'
import * as badgeEvaluator from '@/lib/badgeEvaluator'
import { createMockUserLevel, createMockAchievement } from '@/test/factories/user'

// Mock modules
vi.mock('@/store/authStore')
vi.mock('@/lib/supabase')
vi.mock('@/lib/stats')
vi.mock('@/lib/badgeEvaluator')
vi.mock('@/lib/xpMultipliers', () => ({
  getActiveMultipliers: vi.fn().mockResolvedValue([]),
  formatMultiplier: vi.fn((val) => `${val}x`),
  getMultiplierColor: vi.fn(() => 'text-blue-500'),
}))

describe('UserProfileCard', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockUserLevel = createMockUserLevel({
    level: 5,
    total_xp: 500,
    nickname: 'TestUser',
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useAuthStore
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      initialize: vi.fn(),
    })

    // Mock stats functions
    vi.mocked(stats.getUserLevel).mockResolvedValue(mockUserLevel)
    vi.mocked(stats.getXPProgress).mockReturnValue({
      currentLevel: 5,
      currentLevelXP: 400,
      nextLevelXP: 600,
      progressXP: 100,
      progressPercentage: 50,
    })

    // Mock badge evaluator
    vi.mocked(badgeEvaluator.evaluateAndUnlockBadges).mockResolvedValue([])

    // Mock Supabase responses
    const mockSupabase = supabase as any
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    }))
  })

  it('renders loading state initially', () => {
    renderWithProviders(<UserProfileCard />)
    expect(screen.getByText(/프로필 로딩 중/i)).toBeInTheDocument()
  })

  it('displays user level and XP after loading', async () => {
    const mockSupabase = supabase as any
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'check_history') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            count: 10,
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }
    })

    renderWithProviders(<UserProfileCard />)

    await waitFor(() => {
      expect(screen.getByText(/레벨 5/i)).toBeInTheDocument()
    })

    expect(screen.getByText('TestUser')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('displays total checks and active days statistics', async () => {
    const mockSupabase = supabase as any
    let callCount = 0

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'check_history') {
        callCount++
        if (callCount === 1) {
          // First call: count query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: null,
              count: 42,
              error: null,
            }),
          }
        } else {
          // Second call: data query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { checked_at: '2024-01-01T10:00:00Z' },
                { checked_at: '2024-01-01T14:00:00Z' },
                { checked_at: '2024-01-02T10:00:00Z' },
              ],
              error: null,
            }),
          }
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }
    })

    renderWithProviders(<UserProfileCard />)

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    expect(screen.getByText('2')).toBeInTheDocument() // 2 unique days
  })

  it('shows XP info collapsible section', async () => {
    const mockSupabase = supabase as any
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    }))

    renderWithProviders(<UserProfileCard />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(/레벨 5/i)).toBeInTheDocument()
    })

    // XP info should be collapsed initially
    expect(screen.queryByText(/실천 1회/i)).not.toBeInTheDocument()

    // Click to expand
    const xpButton = screen.getByText(/XP 획득 방법/i)
    await user.click(xpButton)

    // XP info should be visible
    await waitFor(() => {
      expect(screen.getByText(/실천 1회/i)).toBeInTheDocument()
    })
  })

  it('shows badge collection collapsible section', async () => {
    const mockSupabase = supabase as any
    const mockAchievement = createMockAchievement({
      title: 'First Check',
      icon: '🎯',
    })

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'achievements') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [mockAchievement],
            error: null,
          }),
        }
      }
      if (table === 'user_achievements') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }
      }
      if (table === 'check_history') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            count: 0,
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }
    })

    renderWithProviders(<UserProfileCard />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(/레벨 5/i)).toBeInTheDocument()
    })

    // Badge collection should be collapsed initially
    expect(screen.queryByText('First Check')).not.toBeInTheDocument()

    // Click to expand
    const badgeButton = screen.getByText(/배지 컬렉션/i)
    await user.click(badgeButton)

    // Wait for badges to load
    await waitFor(() => {
      expect(screen.getByText('First Check')).toBeInTheDocument()
    })
  })

  it('allows nickname editing', async () => {
    const mockSupabase = supabase as any
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'user_levels') {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: { ...mockUserLevel, nickname: 'NewNickname' },
            error: null,
          }),
        }
      }
      if (table === 'check_history') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            count: 0,
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }
    })

    renderWithProviders(<UserProfileCard />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument()
    })

    // Click edit button
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find((btn) => btn.querySelector('svg'))
    expect(editButton).toBeInTheDocument()
    await user.click(editButton!)

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText('닉네임 변경')).toBeInTheDocument()
    })

    // Type new nickname
    const input = screen.getByPlaceholderText(/2~12자/i)
    await user.clear(input)
    await user.type(input, 'NewNickname')

    // Click save button
    const saveButton = screen.getByText('저장')
    await user.click(saveButton)

    // Verify update was called
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_levels')
    })
  })

  it('validates nickname length', async () => {
    const mockSupabase = supabase as any
    mockSupabase.from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    }))

    renderWithProviders(<UserProfileCard />)
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument()
    })

    // Click edit button
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find((btn) => btn.querySelector('svg'))
    await user.click(editButton!)

    await waitFor(() => {
      expect(screen.getByText('닉네임 변경')).toBeInTheDocument()
    })

    // Try too short nickname
    const input = screen.getByPlaceholderText(/2~12자/i)
    await user.clear(input)
    await user.type(input, 'A')

    const saveButton = screen.getByText('저장')
    await user.click(saveButton)

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/최소 2자 이상/i)).toBeInTheDocument()
    })
  })
})
