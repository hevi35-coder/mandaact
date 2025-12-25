import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type PersonaType = 'working_professional' | 'student' | 'freelancer' | 'custom'
export type StepState = 'not_started' | 'in_progress' | 'completed'
export type SessionStatus = 'active' | 'paused' | 'completed'
export type StepIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7

interface CoachingSummary {
  shortSummary: string
  nextPromptPreview: string
  updatedAt: string
}

interface CoachingContext {
  persona: PersonaType | null
  availableTime?: string
  energyPeak?: string
  priorityArea?: string
  coreGoal?: string
  subGoals?: string[]
}

interface CoachingState {
  sessionId: string | null
  personaType: PersonaType | null
  timezone: string | null
  status: SessionStatus | null
  currentStep: StepIndex
  stepStates: Record<StepIndex, StepState>
  answersByStep: Record<string, Record<string, unknown>>
  context: CoachingContext
  summary: CoachingSummary | null
  lastResumedAt: string | null
  startSession: (params: { sessionId: string; personaType: PersonaType; timezone?: string }) => void
  setCurrentStep: (step: StepIndex) => void
  updateStepState: (step: StepIndex, state: StepState) => void
  setPersonaType: (personaType: PersonaType) => void
  setContext: (payload: Partial<CoachingContext>) => void
  saveAnswer: (stepKey: string, payload: Record<string, unknown>) => void
  setSummary: (shortSummary: string, nextPromptPreview: string) => void
  pauseSession: () => void
  resumeSession: () => void
  completeSession: () => void
  resetSession: () => void
}

const DEFAULT_STEP_STATES: Record<StepIndex, StepState> = {
  1: 'not_started',
  2: 'not_started',
  3: 'not_started',
  4: 'not_started',
  5: 'not_started',
  6: 'not_started',
  7: 'not_started',
}

export const useCoachingStore = create<CoachingState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      personaType: null,
      timezone: null,
      status: null,
      currentStep: 1,
      stepStates: { ...DEFAULT_STEP_STATES },
      answersByStep: {},
      context: { persona: null },
      summary: null,
      lastResumedAt: null,

      startSession: ({ sessionId, personaType, timezone }) => {
        set({
          sessionId,
          personaType,
          timezone: timezone ?? null,
          status: 'active',
          currentStep: 1,
          stepStates: { ...DEFAULT_STEP_STATES, 1: 'in_progress' },
          answersByStep: {},
          context: { persona: personaType },
          summary: null,
          lastResumedAt: new Date().toISOString(),
        })
      },

      setCurrentStep: (step) => {
        set({ currentStep: step })
      },

      updateStepState: (step, state) => {
        set((current) => ({
          stepStates: { ...current.stepStates, [step]: state },
        }))
      },

      setPersonaType: (personaType) => {
        set({ personaType })
      },

      setContext: (payload) => {
        set((current) => ({
          context: { ...current.context, ...payload },
        }))
      },

      saveAnswer: (stepKey, payload) => {
        set((current) => ({
          answersByStep: {
            ...current.answersByStep,
            [stepKey]: payload,
          },
        }))
      },

      setSummary: (shortSummary, nextPromptPreview) => {
        set({
          summary: {
            shortSummary,
            nextPromptPreview,
            updatedAt: new Date().toISOString(),
          },
        })
      },

      pauseSession: () => {
        const { status } = get()
        if (status === 'completed') return
        set({ status: 'paused', lastResumedAt: new Date().toISOString() })
      },

      resumeSession: () => {
        const { status } = get()
        if (status === 'completed') return
        set({ status: 'active', lastResumedAt: new Date().toISOString() })
      },

      completeSession: () => {
        set({ status: 'completed', lastResumedAt: new Date().toISOString() })
      },

      resetSession: () => {
        set({
          sessionId: null,
          personaType: null,
          timezone: null,
          status: null,
          currentStep: 1,
          stepStates: { ...DEFAULT_STEP_STATES },
          answersByStep: {},
          context: { persona: null },
          summary: null,
          lastResumedAt: null,
        })
      },
    }),
    {
      name: 'mandaact-coaching-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
