import { describe, it, expect } from 'vitest'
import { debounce, throttle, memoize } from '../performanceUtils'

describe('performanceUtils', () => {
    describe('debounce', () => {
        it('should delay function execution', async () => {
            let count = 0
            const debouncedFn = debounce(() => {
                count++
            }, 100)

            debouncedFn()
            debouncedFn()
            debouncedFn()

            expect(count).toBe(0)

            await new Promise(resolve => setTimeout(resolve, 150))
            expect(count).toBe(1)
        })

        it('should pass arguments correctly', async () => {
            let result = ''
            const debouncedFn = debounce((text: string) => {
                result = text
            }, 50)

            debouncedFn('hello')
            await new Promise(resolve => setTimeout(resolve, 100))
            expect(result).toBe('hello')
        })
    })

    describe('throttle', () => {
        it('should limit function calls', async () => {
            let count = 0
            const throttledFn = throttle(() => {
                count++
            }, 100)

            throttledFn()
            throttledFn()
            throttledFn()

            expect(count).toBe(1)

            await new Promise(resolve => setTimeout(resolve, 150))
            throttledFn()
            expect(count).toBe(2)
        })
    })

    describe('memoize', () => {
        it('should cache function results', () => {
            let callCount = 0
            const expensiveFn = memoize((n: number) => {
                callCount++
                return n * 2
            })

            const result1 = expensiveFn(5)
            const result2 = expensiveFn(5)
            const result3 = expensiveFn(10)

            expect(result1).toBe(10)
            expect(result2).toBe(10)
            expect(result3).toBe(20)
            expect(callCount).toBe(2) // Called only twice, not three times
        })
    })
})
