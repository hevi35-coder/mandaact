import { describe, it, expect } from 'vitest'
import { calculateLevelFromXP, getXPForNextLevel } from '../stats'

describe('stats - XP and Level calculations', () => {
    describe('calculateLevelFromXP', () => {
        it('should return level 1 for XP < 100', () => {
            expect(calculateLevelFromXP(0)).toBe(1)
            expect(calculateLevelFromXP(50)).toBe(1)
            expect(calculateLevelFromXP(99)).toBe(1)
        })

        it('should return level 2 for XP 100-249', () => {
            expect(calculateLevelFromXP(100)).toBe(2)
            expect(calculateLevelFromXP(200)).toBe(2)
            expect(calculateLevelFromXP(249)).toBe(2)
        })

        it('should calculate levels 3-6 correctly', () => {
            expect(calculateLevelFromXP(250)).toBe(3)  // Level 3: 250 XP
            expect(calculateLevelFromXP(450)).toBe(4)  // Level 4: 450 XP
            expect(calculateLevelFromXP(700)).toBe(5)  // Level 5: 700 XP
            expect(calculateLevelFromXP(1000)).toBe(6) // Level 6: 1000 XP
        })

        it('should calculate higher levels correctly', () => {
            expect(calculateLevelFromXP(3000)).toBeGreaterThan(7)
            expect(calculateLevelFromXP(10000)).toBeGreaterThan(13)
        })
    })

    describe('getXPForNextLevel', () => {
        it('should return correct XP thresholds for reaching levels', () => {
            // getXPForNextLevel returns minimum XP to BE at that level
            expect(getXPForNextLevel(2)).toBe(100)  // Level 2 threshold: 100 XP
            expect(getXPForNextLevel(3)).toBe(250)  // Level 3 threshold: 250 XP
            expect(getXPForNextLevel(4)).toBe(450)  // Level 4 threshold: 450 XP
            expect(getXPForNextLevel(5)).toBe(700)  // Level 5 threshold: 700 XP
        })

        it('should return increasing XP requirements', () => {
            const level5XP = getXPForNextLevel(5)
            const level10XP = getXPForNextLevel(10)
            expect(level10XP).toBeGreaterThan(level5XP)
        })
    })
})
