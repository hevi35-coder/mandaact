import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { coachingService } from '../services/coachingService'
import { supabase } from '../lib/supabase'

export type PersonaType = 'working_professional' | 'student' | 'freelancer' | 'custom'
export type StepState = 'not_started' | 'in_progress' | 'completed'
export type SessionStatus = 'active' | 'paused' | 'completed'
export type StepIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

interface CoachingSummary {
  shortSummary: string
  nextPromptPreview: string
  updatedAt: string
}

interface CoachingContext {
  persona: PersonaType | null
  priorityArea?: string
  coreGoal?: string
  subGoals?: string[]
  detailedContext?: string
}

export interface MandalartAction {
  sub_goal: string
  content: string
  type: 'habit' | 'task'
}

export interface MandalartDraft {
  center_goal: string
  sub_goals: string[]
  actions: MandalartAction[]
  emergency_action?: string // The 'Safety Net' chosen via AI coaching
}

interface CoachingState {
  sessionId: string | null
  personaType: PersonaType | null
  timezone: string | null
  status: SessionStatus | null
  currentStep: StepIndex
  stepStates: Record<StepIndex, StepState>
  answersByStep: Record<string, unknown>
  context: CoachingContext
  summary: CoachingSummary | null
  lastResumedAt: string | null
  chatMessages: { role: 'user' | 'assistant' | 'system', content: string }[]
  mandalartDraft: MandalartDraft
  slotsFilled: string[]
  consentAgreed: boolean
  setConsentAgreed: (agreed: boolean) => void
  setCurrentStep: (step: StepIndex) => void
  updateStepState: (step: StepIndex, state: StepState) => void
  setContext: (payload: Partial<CoachingContext>) => void
  setSummary: (shortSummary: string, nextPromptPreview: string) => void
  startSession: (user_id: string, persona: PersonaType) => Promise<string | null>
  loadSession: (session_id: string) => Promise<void>
  resumeSession: () => void
  saveAnswer: (step_key: string, answer: unknown) => Promise<void>
  setPersonaType: (type: PersonaType | null) => void
  pauseSession: () => void
  completeSession: () => void
  resetSession: () => void
  addChatMessage: (role: 'user' | 'assistant' | 'system', content: string) => void
  updateMandalartDraft: (draft: Partial<MandalartDraft>) => void
  setSlotsFilled: (slots: string[]) => void
  commitCoachingResult: (user_id: string) => Promise<string | null>
  syncStepFromServer: (step: number, draft: Partial<MandalartDraft>) => void
}


const DEFAULT_STEP_STATES: Record<StepIndex, StepState> = {
  1: 'not_started',
  2: 'not_started',
  3: 'not_started',
  4: 'not_started',
  5: 'not_started',
  6: 'not_started',
  7: 'not_started',
  8: 'not_started',
  9: 'not_started',
  10: 'not_started',
  11: 'not_started',
  12: 'not_started',
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
      chatMessages: [],
      mandalartDraft: {
        center_goal: '',
        sub_goals: Array(8).fill(''),
        actions: [],
        emergency_action: '',
      },
      slotsFilled: [],
      consentAgreed: false,

      setConsentAgreed: (agreed) => set({ consentAgreed: agreed }),

      startSession: async (user_id: string, persona: PersonaType) => {
        try {
          const { data, error } = await supabase
            .from('coaching_sessions')
            .insert({
              user_id,
              persona_type: persona,
              status: 'active',
              current_step: 1,
            })
            .select()
            .single()

          if (error) throw error

          set({
            status: 'active',
            currentStep: 1,
            personaType: persona,
            sessionId: data.id,
            answersByStep: {},
            lastResumedAt: new Date().toISOString(),
            chatMessages: [],
            mandalartDraft: {
              center_goal: '',
              sub_goals: Array(8).fill(''),
              actions: [],
              emergency_action: '',
            },
            slotsFilled: [],
          })
          return data.id
        } catch (error) {
          console.error('Failed to start coaching session', error)
          return null
        }
      },

      setCurrentStep: (step) => {
        set({ currentStep: step })
      },

      updateStepState: (step, state) => {
        set((current) => ({
          stepStates: { ...current.stepStates, [step]: state },
        }))
      },

      setPersonaType: (type) => {
        set({ personaType: type })
      },

      setContext: (payload) => {
        set((current) => ({
          context: { ...current.context, ...payload },
        }))
      },

      loadSession: async (session_id: string) => {
        try {
          const { data: session, error: sessionError } = await supabase
            .from('coaching_sessions')
            .select('*')
            .eq('id', session_id)
            .single()

          if (sessionError) throw sessionError

          const { data: answers, error: answersError } = await supabase
            .from('coaching_answers')
            .select('step_key, answer_json')
            .eq('session_id', session_id)

          if (answersError) throw answersError

          const answersObj: Record<string, any> = {}
          answers.forEach((a: any) => {
            answersObj[a.step_key] = a.answer_json
          })

          set({
            status: 'active',
            sessionId: session_id,
            currentStep: session.current_step as StepIndex,
            personaType: session.persona_type as PersonaType,
            answersByStep: answersObj,
            lastResumedAt: new Date().toISOString(),

            chatMessages: session.metadata?.chat_history || [],
            mandalartDraft: session.metadata?.draft || {
              center_goal: '',
              sub_goals: Array(8).fill(''),
              actions: [],
              emergency_action: '',
            },

            slotsFilled: answersObj['slots_filled'] || [],
          })
        } catch (error) {
          console.error('Failed to load coaching session', error)
        }
      },

      resumeSession: () => {
        const { sessionId } = get()
        if (!sessionId) return
        set({ status: 'active', lastResumedAt: new Date().toISOString() })
      },

      saveAnswer: async (step_key: string, answer: unknown) => {
        const { sessionId } = get()
        if (sessionId) {
          try {
            await supabase
              .from('coaching_answers')
              .upsert({
                session_id: sessionId,
                step_key: step_key,
                answer_json: answer,
              }, { onConflict: 'session_id, step_key' })

            // Update current step in session
            const stepNum = parseInt(step_key.replace('step', ''))
            if (!isNaN(stepNum)) {
              await supabase
                .from('coaching_sessions')
                .update({ current_step: stepNum })
                .eq('id', sessionId)
            }
          } catch (error) {
            console.error('Failed to save answer to DB', error)
          }
        }

        set((state) => ({
          answersByStep: {
            ...state.answersByStep,
            [step_key]: answer,
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
          chatMessages: [],
          mandalartDraft: {
            center_goal: '',
            sub_goals: Array(8).fill(''),
            actions: [],
            emergency_action: '',
          },
          slotsFilled: [],
        })
      },

      addChatMessage: (role, content) => {
        set((state) => {
          const newMessages = [...state.chatMessages, { role, content }]
          if (state.sessionId) {
            get().saveAnswer('chat_history', newMessages)
          }
          return { chatMessages: newMessages }
        })
      },

      updateMandalartDraft: (draft) => {
        set((state) => {
          const newDraft = { ...state.mandalartDraft, ...draft }
          if (state.sessionId) {
            get().saveAnswer('mandalart_draft', newDraft)
          }
          return { mandalartDraft: newDraft }
        })
      },

      setSlotsFilled: (slots) => {
        set((state) => {
          if (state.sessionId) {
            get().saveAnswer('slots_filled', slots)
          }
          return { slotsFilled: slots }
        })
      },

      commitCoachingResult: async (user_id: string) => {
        const { mandalartDraft, sessionId } = get()
        if (!mandalartDraft.center_goal) {
          throw new Error('Core goal is missing')
        }

        try {
          // Use the high-resilience Server-Side commit logic
          const result = await coachingService.commitMandalart(mandalartDraft, sessionId)

          if (!result.success) {
            throw new Error(result.error || 'Server-side commit failed')
          }

          // Update local status
          set({ status: 'completed' })

          return result.mandalartId || null
        } catch (error) {
          console.error('Final commit error:', error)
          return null
        }
      },

      syncStepFromServer: (step, draft) => {
        set((current) => {
          const newDraft = { ...current.mandalartDraft }

          if (draft.center_goal) newDraft.center_goal = draft.center_goal

          if (draft.sub_goals && Array.isArray(draft.sub_goals)) {
            // Keep existing ones, only update if the new one has a value
            newDraft.sub_goals = current.mandalartDraft.sub_goals.map((sg, i) =>
              (draft.sub_goals && draft.sub_goals[i]) ? draft.sub_goals[i] : sg
            )
          }

          if (draft.actions && Array.isArray(draft.actions)) {
            // Logic: Remove old actions for the sub-goals included in this update, then add new ones
            // Normalized schema support: handle both 'title' and 'content' fields
            const normalizedActions = draft.actions.map(a => ({
              ...a,
              sub_goal: a.sub_goal || (a as any).title || '',
              content: a.content || (a as any).title || '',
              type: ((a as any).type === 'habit' || (a as any).type === 'routine') ? 'habit' : 'task'
            })) as MandalartAction[]
            const updatedSgNames = new Set(normalizedActions.map(a => a.sub_goal))
            const filteredActions = current.mandalartDraft.actions.filter(a => !updatedSgNames.has(a.sub_goal))
            newDraft.actions = [...filteredActions, ...normalizedActions]
          }

          if (draft.emergency_action) {
            newDraft.emergency_action = draft.emergency_action
          }

          return {
            currentStep: step as StepIndex,
            mandalartDraft: newDraft,
          }
        })
      },

    }),
    {
      name: 'mandaact-coaching-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
