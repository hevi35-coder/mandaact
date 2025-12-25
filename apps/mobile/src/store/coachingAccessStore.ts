import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getPeriodBounds } from '@mandaact/shared'

type AccessSource = 'free' | 'ad' | 'premium'

interface CoachingAccessState {
  weekStart: string | null
  weeklySessions: number
  weeklyAdUnlocks: number
  lifetimeSessions: number
  lastSessionStartedAt: string | null
  ensureCurrentWeek: () => void
  registerSessionStart: (source: AccessSource) => void
  reset: () => void
}

const getCurrentWeekStart = () => getPeriodBounds(new Date(), 'weekly').start

export const useCoachingAccessStore = create<CoachingAccessState>()(
  persist(
    (set) => ({
      weekStart: null,
      weeklySessions: 0,
      weeklyAdUnlocks: 0,
      lifetimeSessions: 0,
      lastSessionStartedAt: null,

      ensureCurrentWeek: () => {
        const currentWeekStart = getCurrentWeekStart()
        set((state) => {
          if (state.weekStart === currentWeekStart) {
            return state
          }
          return {
            ...state,
            weekStart: currentWeekStart,
            weeklySessions: 0,
            weeklyAdUnlocks: 0,
          }
        })
      },

      registerSessionStart: (source) => {
        const currentWeekStart = getCurrentWeekStart()
        set((state) => {
          const isNewWeek = state.weekStart !== currentWeekStart
          const weeklySessions = isNewWeek ? 0 : state.weeklySessions
          const weeklyAdUnlocks = isNewWeek ? 0 : state.weeklyAdUnlocks
          return {
            weekStart: currentWeekStart,
            weeklySessions: weeklySessions + 1,
            weeklyAdUnlocks: weeklyAdUnlocks + (source === 'ad' ? 1 : 0),
            lifetimeSessions: state.lifetimeSessions + 1,
            lastSessionStartedAt: new Date().toISOString(),
          }
        })
      },

      reset: () => {
        set({
          weekStart: null,
          weeklySessions: 0,
          weeklyAdUnlocks: 0,
          lifetimeSessions: 0,
          lastSessionStartedAt: null,
        })
      },
    }),
    {
      name: 'mandaact-coaching-access',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
