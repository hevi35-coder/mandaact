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

        it('should return level 3 for XP 250-449', () => {
            expect(calculateLevelFromXP(250)).toBe(3)
            expect(calculateLevelFromXP(400)).toBe(3)
            expect(calculateLevelFromXP(449)).toBe(3)
        })

        it('should calculate levels 4-6 correctly', () => {
            expect(calculateLevelFromXP(450)).toBe(4)  // Level 4: 450-699
            expect(calculateLevelFromXP(700)).toBe(5)  // Level 5: 700-999
            expect(calculateLevelFromXP(1000)).toBe(6) // Level 6: 1000-1349
        })

        it('should calculate higher levels correctly', () => {
            expect(calculateLevelFromXP(2000)).toBe(8)  // Level 8: 1750-2199
            expect(calculateLevelFromXP(3000)).toBe(10) // Level 10: 2700-3299
            expect(calculateLevelFromXP(10000)).toBeGreaterThan(13)
        })
    })

    describe('getXPForNextLevel', () => {
        it('should return correct XP thresholds for each level', () => {
            // getXPForNextLevel returns minimum XP to BE at that level
            expect(getXPForNextLevel(1)).toBe(0)     // Level 1 starts at 0 XP
            expect(getXPForNextLevel(2)).toBe(100)   // Level 2 starts at 100 XP
            expect(getXPForNextLevel(3)).toBe(250)   // Level 3 starts at 250 XP
            expect(getXPForNextLevel(4)).toBe(450)   // Level 4 starts at 450 XP
            expect(getXPForNextLevel(5)).toBe(700)   // Level 5 starts at 700 XP
            expect(getXPForNextLevel(6)).toBe(1000)  // Level 6 starts at 1000 XP
            expect(getXPForNextLevel(10)).toBe(2700) // Level 10 starts at 2700 XP
        })

        it('should increase by 50 XP per level increment', () => {
            // Level 1→2: 100 XP (base)
            // Level 2→3: 150 XP (+50)
            // Level 3→4: 200 XP (+50)
            expect(getXPForNextLevel(3) - getXPForNextLevel(2)).toBe(150) // +50 from level 1→2
            expect(getXPForNextLevel(4) - getXPForNextLevel(3)).toBe(200) // +50 from level 2→3
            expect(getXPForNextLevel(5) - getXPForNextLevel(4)).toBe(250) // +50 from level 3→4
        })
    })
})
