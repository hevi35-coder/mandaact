import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface PlanState {
  activeBySubGoal: Record<string, string>
  minimumBySubGoal: Record<string, string>
  setPreferences: (payload: {
    activeBySubGoal: Record<string, string>
    minimumBySubGoal: Record<string, string>
  }) => void
  mergePreferences: (payload: {
    activeBySubGoal: Record<string, string>
    minimumBySubGoal: Record<string, string>
  }) => void
  toggleActiveAction: (subGoalId: string, actionId: string) => void
  toggleMinimumAction: (subGoalId: string, actionId: string) => void
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      activeBySubGoal: {},
      minimumBySubGoal: {},

      setPreferences: (payload) => {
        set({
          activeBySubGoal: payload.activeBySubGoal,
          minimumBySubGoal: payload.minimumBySubGoal,
        })
      },

      mergePreferences: (payload) => {
        set((state) => ({
          activeBySubGoal: {
            ...state.activeBySubGoal,
            ...payload.activeBySubGoal,
          },
          minimumBySubGoal: {
            ...state.minimumBySubGoal,
            ...payload.minimumBySubGoal,
          },
        }))
      },

      toggleActiveAction: (subGoalId, actionId) => {
        const current = get().activeBySubGoal[subGoalId]
        set((state) => ({
          activeBySubGoal: {
            ...state.activeBySubGoal,
            [subGoalId]: current === actionId ? '' : actionId,
          },
        }))
      },

      toggleMinimumAction: (subGoalId, actionId) => {
        const current = get().minimumBySubGoal[subGoalId]
        set((state) => ({
          minimumBySubGoal: {
            ...state.minimumBySubGoal,
            [subGoalId]: current === actionId ? '' : actionId,
          },
        }))
      },
    }),
    {
      name: 'mandaact-plan-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
