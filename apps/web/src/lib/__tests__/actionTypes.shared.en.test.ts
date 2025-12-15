import { describe, it, expect } from 'vitest'
import { suggestActionType } from '@mandaact/shared'

describe('suggestActionType (@mandaact/shared) - English inputs', () => {
  it('daily routine with explicit keyword', () => {
    const result = suggestActionType('Work out daily')
    expect(result.type).toBe('routine')
    expect(result.confidence).toBe('high')
    expect(result.routineFrequency).toBe('daily')
  })

  it('time-based routine', () => {
    const result = suggestActionType('Read 30 minutes daily')
    expect(result.type).toBe('routine')
    expect(result.confidence).toBe('high')
    expect(result.routineFrequency).toBe('daily')
  })

  it('times per week routine', () => {
    const result = suggestActionType('Gym 3 times per week')
    expect(result.type).toBe('routine')
    expect(result.confidence).toBe('high')
    expect(result.routineFrequency).toBe('weekly')
    expect(result.routineCountPerPeriod).toBe(3)
  })

  it('weekday-based routine (Mon/Wed/Fri)', () => {
    const result = suggestActionType('Mon Wed Fri yoga')
    expect(result.type).toBe('routine')
    expect(result.confidence).toBe('high')
    expect(result.routineFrequency).toBe('weekly')
    expect(result.routineWeekdays).toEqual([1, 3, 5])
  })

  it('weekend routine', () => {
    const result = suggestActionType('Hiking on weekends')
    expect(result.type).toBe('routine')
    expect(result.confidence).toBe('high')
    expect(result.routineFrequency).toBe('weekly')
    expect(result.routineWeekdays).toEqual([0, 6])
  })

  it('one-time mission (certification/exam)', () => {
    const result = suggestActionType('Get AWS certification')
    expect(result.type).toBe('mission')
    expect(result.confidence).toBe('high')
    expect(result.missionCompletionType).toBe('once')
  })

  it('mindset/reference', () => {
    const result = suggestActionType('Build a consistent mindset')
    expect(result.type).toBe('reference')
  })
})

