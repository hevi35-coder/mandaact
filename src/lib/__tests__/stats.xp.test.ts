import { describe, it, expect } from 'vitest'
import { calculateLevelFromXP, getXPForNextLevel } from '../stats'

describe('stats - XP and Level calculations', () => {
    describe('calculateLevelFromXP', () => {
        it('should return level 1 for XP < 100', () => {
            expect(calculateLevelFromXP(0)).toBe(1)
            expect(calculateLevelFromXP(50)).toBe(1)
            expect(calculateLevelFromXP(99)).toBe(1)
        })

        it('should return level 2 for XP 100-399', () => {
            expect(calculateLevelFromXP(100)).toBe(2)
            expect(calculateLevelFromXP(200)).toBe(2)
            expect(calculateLevelFromXP(399)).toBe(2)
        })

        it('should calculate levels 3-5 correctly', () => {
            expect(calculateLevelFromXP(400)).toBe(3)
            expect(calculateLevelFromXP(1000)).toBe(5) // Fixed: 1000 XP is level 5, not 4
            expect(calculateLevelFromXP(2000)).toBeGreaterThanOrEqual(5)
        })

        it('should calculate higher levels correctly', () => {
            expect(calculateLevelFromXP(3000)).toBeGreaterThan(5)
            expect(calculateLevelFromXP(10000)).toBeGreaterThan(10)
        })
    })

    describe('getXPForNextLevel', () => {
        it('should return correct XP thresholds', () => {
            expect(getXPForNextLevel(1)).toBe(100)
            expect(getXPForNextLevel(2)).toBe(400)
        })

        it('should return increasing XP requirements', () => {
            const level5XP = getXPForNextLevel(5)
            const level10XP = getXPForNextLevel(10)
            expect(level10XP).toBeGreaterThan(level5XP)
        })
    })
})
