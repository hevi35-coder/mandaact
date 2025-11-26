import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getActiveMultipliers,
  calculateTotalMultiplier,
  activateLevelMilestoneBonus,
  activatePerfectWeekBonus,
  formatMultiplier,
  getMultiplierColor,
  type XPMultiplier,
} from '../xpMultipliers'
import { supabase } from '../supabase'

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('XP Multipliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Date mocking
    vi.useRealTimers()
  })

  describe('calculateTotalMultiplier', () => {
    it('should return 1.0 when no multipliers', () => {
      const result = calculateTotalMultiplier([])
      expect(result).toBe(1.0)
    })

    it('should add multipliers additively', () => {
      const multipliers: XPMultiplier[] = [
        {
          type: 'weekend',
          name: '주말 보너스',
          multiplier: 1.5,
          active: true,
          description: '주말 보너스',
        },
        {
          type: 'comeback',
          name: '컴백 보너스',
          multiplier: 1.5,
          active: true,
          description: '컴백 보너스',
        },
      ]

      const result = calculateTotalMultiplier(multipliers)
      expect(result).toBe(3.0) // 1.5 + 1.5 = 3.0
    })

    it('should handle multiple multipliers correctly', () => {
      const multipliers: XPMultiplier[] = [
        {
          type: 'weekend',
          name: '주말 보너스',
          multiplier: 1.5,
          active: true,
          description: '주말 보너스',
        },
        {
          type: 'level_milestone',
          name: '레벨 마일스톤',
          multiplier: 2.0,
          active: true,
          description: '레벨 마일스톤',
        },
        {
          type: 'perfect_week',
          name: '완벽한 주',
          multiplier: 2.0,
          active: true,
          description: '완벽한 주',
        },
      ]

      const result = calculateTotalMultiplier(multipliers)
      expect(result).toBe(5.5) // 1.5 + 2.0 + 2.0 = 5.5
    })
  })

  describe('getActiveMultipliers', () => {
    it('should include weekend bonus on Saturday', async () => {
      // Mock Saturday
      const saturday = new Date('2025-11-22T10:00:00') // Saturday
      vi.setSystemTime(saturday)

      // Mock Supabase responses for other multipliers
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === 'check_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          }),
        }
      })
      vi.mocked(supabase.from).mockImplementation(fromMock)

      const multipliers = await getActiveMultipliers('test-user-id')
      const weekendBonus = multipliers.find(m => m.type === 'weekend')

      expect(weekendBonus).toBeDefined()
      expect(weekendBonus?.multiplier).toBe(1.5)
      expect(weekendBonus?.name).toBe('주말 보너스')
    })

    it('should include weekend bonus on Sunday', async () => {
      // Mock Sunday
      const sunday = new Date('2025-11-23T10:00:00') // Sunday
      vi.setSystemTime(sunday)

      // Mock Supabase responses
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === 'check_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          }),
        }
      })
      vi.mocked(supabase.from).mockImplementation(fromMock)

      const multipliers = await getActiveMultipliers('test-user-id')
      const weekendBonus = multipliers.find(m => m.type === 'weekend')

      expect(weekendBonus).toBeDefined()
      expect(weekendBonus?.multiplier).toBe(1.5)
    })

    it('should not include weekend bonus on weekday', async () => {
      // Mock Monday
      const monday = new Date('2025-11-24T10:00:00') // Monday
      vi.setSystemTime(monday)

      // Mock Supabase responses
      const fromMock = vi.fn().mockImplementation((table: string) => {
        if (table === 'check_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [] }),
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
          }),
        }
      })
      vi.mocked(supabase.from).mockImplementation(fromMock)

      const multipliers = await getActiveMultipliers('test-user-id')
      const weekendBonus = multipliers.find(m => m.type === 'weekend')

      expect(weekendBonus).toBeUndefined()
    })

    it('should include active comeback bonus', async () => {
      const monday = new Date('2025-11-25T10:00:00')
      vi.setSystemTime(monday)

      // Mock active comeback bonus
      const comebackBonus = {
        user_id: 'test-user-id',
        bonus_type: 'comeback',
        multiplier: 1.5,
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
      }

      // Mock user_bonus_xp for comeback
      const fromMock = vi.fn()
      fromMock.mockImplementation((table: string) => {
        if (table === 'user_bonus_xp') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation((field, value) => {
                  if (field === 'bonus_type' && value === 'comeback') {
                    return {
                      gte: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({ data: comebackBonus }),
                      }),
                    }
                  }
                  return {
                    gte: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                    }),
                  }
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
        }
      })
      vi.mocked(supabase.from).mockImplementation(fromMock)

      const multipliers = await getActiveMultipliers('test-user-id')
      const comeback = multipliers.find(m => m.type === 'comeback')

      expect(comeback).toBeDefined()
      expect(comeback?.multiplier).toBe(1.5)
      expect(comeback?.daysRemaining).toBe(2)
    })
  })

  describe('activateLevelMilestoneBonus', () => {
    it('should activate bonus for milestone levels', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null })
      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
        insert: insertMock,
      })
      vi.mocked(supabase.from).mockImplementation(fromMock)

      const result = await activateLevelMilestoneBonus('test-user-id', 5)
      expect(result).toBe(true)
      expect(insertMock).toHaveBeenCalled()
    })

    it('should not activate for non-milestone levels', async () => {
      const result = await activateLevelMilestoneBonus('test-user-id', 4)
      expect(result).toBe(false)
    })

    it('should not activate if already active', async () => {
      const existingBonus = {
        user_id: 'test-user-id',
        bonus_type: 'level_milestone',
      }

      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ data: [existingBonus] }),
            }),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(fromMock)

      const result = await activateLevelMilestoneBonus('test-user-id', 10)
      expect(result).toBe(false)
    })
  })

  describe('activatePerfectWeekBonus', () => {
    it('should activate perfect week bonus', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null })
      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
        insert: insertMock,
      })
      vi.mocked(supabase.from).mockImplementation(fromMock)

      const result = await activatePerfectWeekBonus('test-user-id')
      expect(result).toBe(true)
      expect(insertMock).toHaveBeenCalled()
    })

    it('should not activate if already active', async () => {
      const existingBonus = {
        user_id: 'test-user-id',
        bonus_type: 'perfect_week',
      }

      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ data: [existingBonus] }),
            }),
          }),
        }),
      })
      vi.mocked(supabase.from).mockImplementation(fromMock)

      const result = await activatePerfectWeekBonus('test-user-id')
      expect(result).toBe(false)
    })
  })

  describe('formatMultiplier', () => {
    it('should format multipliers correctly', () => {
      expect(formatMultiplier(1.5)).toBe('×1.5')
      expect(formatMultiplier(2.0)).toBe('×2.0')
      expect(formatMultiplier(3.5)).toBe('×3.5')
      expect(formatMultiplier(1.0)).toBe('×1.0')
    })
  })

  describe('getMultiplierColor', () => {
    it('should return correct color for each type', () => {
      expect(getMultiplierColor('weekend')).toBe('text-blue-500')
      expect(getMultiplierColor('comeback')).toBe('text-green-500')
      expect(getMultiplierColor('level_milestone')).toBe('text-yellow-500')
      expect(getMultiplierColor('perfect_week')).toBe('text-purple-500')
    })
  })
})