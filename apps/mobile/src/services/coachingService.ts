import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

export interface AISuggestSubGoalsParams {
    persona: string
    coreGoal: string
    priorityArea: string
    detailedContext?: string
    language?: string
}

export interface AIGenerateActionsParams {
    subGoals: string[]
    persona: string
    detailedContext?: string
    language?: string
}

export interface AIRealityCheckParams {
    coreGoal: string
    subGoals: string[]
    actions: unknown[]
    detailedContext?: string
    language?: string
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export interface AIChatParams {
    messages: ChatMessage[]
    currentDraft?: any
    language?: string
    slotsFilled?: string[]
    step?: number // v11.0 Siloed Step
}


export interface ChatResponse {
    message: string
    updated_draft?: {
        center_goal: string
        sub_goals: string[]
        actions: { sub_goal: string; content: string; type: 'habit' | 'task' }[]
        emergency_action?: string
        resilience_strategy?: string
    }
    slots_filled: string[]
    completed_phases?: string[]
    current_phase?: string // Server-determined current phase (legacy)
    current_step?: number // v11.0 Siloed Step
    phase_progress?: number // 0-5 phase progress indicator (legacy)
    next_step_recommendation: string
    next_step_ready?: boolean

    version?: string
    server_time?: string
    error?: string
}

export interface ActionVariant {
    sub_goal: string
    content: string
}

export interface RealityCorrection {
    original: string
    suggested: string
    reason: string
}

class CoachingService {
    private async invokeFunction(action: string, payload: unknown, sessionId?: string | null) {
        try {
            const { data, error } = await supabase.functions.invoke('ai-coaching', {
                body: { action, payload, sessionId },
            })

            if (error) {
                // Try to extract body from FunctionsHttpError
                let details = null
                try {
                    // In some versions error.context is a Response object
                    if (error.context && typeof error.context.json === 'function') {
                        details = await error.context.json()
                    }
                } catch (e) { /* ignore */ }

                if (details) {
                    const version = details.version || 'unknown'
                    const errorMsg = details.error || details.message
                    if (errorMsg) {
                        const finalMsg = typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg)
                        // Prepend version to help with deployment tracking in UI
                        throw new Error(`[${version}] ${finalMsg}`)
                    }
                }
                throw error
            }

            if (data && data.version) {
                console.log(`[AI-Coaching] Server Version: ${data.version} | Action: ${action}`)
            }
            return data
        } catch (error: any) {
            // Use warn instead of error to prevent the development red screen overlay for AI service interruptions
            const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error))
            logger.warn(`AI Coaching service issue (${action})`, { error: errorMsg })
            throw error
        }
    }

    async suggestSubGoals(params: AISuggestSubGoalsParams, sessionId?: string | null): Promise<string[]> {
        const result = await this.invokeFunction('suggest_sub_goals', params, sessionId)
        return result.sub_goals || []
    }

    async generateActions(params: AIGenerateActionsParams, sessionId?: string | null): Promise<ActionVariant[]> {
        const result = await this.invokeFunction('generate_actions', params, sessionId)
        return result.actions || []
    }

    async runRealityCheck(
        params: AIRealityCheckParams,
        sessionId?: string | null
    ): Promise<{
        corrections: RealityCorrection[]
        overall_feedback: string
    }> {
        return await this.invokeFunction('reality_check', params, sessionId)
    }

    async chat(params: AIChatParams, sessionId?: string | null): Promise<ChatResponse> {
        return await this.invokeFunction('chat', params, sessionId)
    }

    async commitMandalart(mandalart_draft: any, sessionId?: string | null): Promise<{ success: boolean; mandalartId?: string; error?: string }> {
        return await this.invokeFunction('commit_mandalart', { mandalart_draft }, sessionId)
    }
}

export const coachingService = new CoachingService()
