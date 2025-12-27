import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

export interface AISuggestSubGoalsParams {
    persona: string
    coreGoal: string
    availableTime: string
    energyPeak: string
    priorityArea: string
    detailedContext?: string
}

export interface AIGenerateActionsParams {
    subGoals: string[]
    persona: string
    availableTime: string
    detailedContext?: string
}

export interface AIRealityCheckParams {
    coreGoal: string
    subGoals: string[]
    actions: unknown[]
    availableTime: string
    energyPeak: string
    detailedContext?: string
}

export interface ActionVariant {
    sub_goal: string
    base: string
    minimum: string
    challenge: string
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

            if (error) throw error
            return data
        } catch (error) {
            logger.error(`AI Coaching error (${action})`, error)
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
}

export const coachingService = new CoachingService()
