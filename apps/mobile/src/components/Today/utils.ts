/**
 * Utility functions for Today screen
 */

import type { ActionType } from '@mandaact/shared'

// Weekday number to translation key mapping
export const weekdayKeyMap: Record<number, string> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat'
}

/**
 * Format type details with i18n
 */
export function formatTypeDetailsLocalized(
    action: {
        type: ActionType
        routine_frequency?: string
        routine_weekdays?: number[]
        routine_count_per_period?: number
        mission_completion_type?: string
        mission_period_cycle?: string
    },
    t: (key: string, params?: Record<string, unknown>) => string
): string {
    if (action.type === 'reference') {
        return ''
    }

    if (action.type === 'routine') {
        const frequency = action.routine_frequency
        const weekdays = action.routine_weekdays || []
        const count = action.routine_count_per_period || 1

        if (frequency === 'daily') {
            return t('actionType.format.daily')
        }

        if (frequency === 'weekly') {
            if (weekdays.length > 0) {
                // Sort weekdays: 1,2,3,4,5,6,0 (Mon-Sun)
                const sortedDays = [...weekdays].sort((a, b) => {
                    const orderA = a === 0 ? 7 : a
                    const orderB = b === 0 ? 7 : b
                    return orderA - orderB
                })
                const dayNames = sortedDays.map(d => t(`actionType.weekdayShort.${weekdayKeyMap[d]}`)).join(', ')
                if (count && count > 0) {
                    return t('actionType.format.timesPerWeekWithDays', { count, days: dayNames })
                }
                return t('actionType.format.weekdays', { days: dayNames })
            }
            return t('actionType.format.timesPerWeek', { count })
        }

        if (frequency === 'monthly') {
            return t('actionType.format.timesPerMonth', { count })
        }
    }

    if (action.type === 'mission') {
        const completionType = action.mission_completion_type
        const periodCycle = action.mission_period_cycle

        if (completionType === 'once') {
            return t('actionType.format.onceComplete')
        }

        if (completionType === 'periodic') {
            if (periodCycle === 'quarterly') {
                return t('actionType.format.periodicQuarterly')
            }
            if (periodCycle === 'yearly') {
                return t('actionType.format.periodicYearly')
            }
            return t('actionType.format.periodicMonthly')
        }
    }

    return ''
}
