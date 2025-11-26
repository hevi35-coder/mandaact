/**
 * Performance optimization utilities
 */

/**
 * Debounce function - delays execution until after wait time has elapsed since last call
 * Useful for: search inputs, resize handlers, scroll handlers
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null
            func(...args)
        }

        if (timeout) {
            clearTimeout(timeout)
        }
        timeout = setTimeout(later, wait)
    }
}

/**
 * Throttle function - ensures function is called at most once per specified time period
 * Useful for: scroll handlers, mouse move handlers, window resize
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean
    let lastResult: ReturnType<T>

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            lastResult = func(...args) as ReturnType<T>
            inThrottle = true
            setTimeout(() => {
                inThrottle = false
            }, limit)
        }
        return lastResult
    }
}

/**
 * Request Animation Frame throttle - ensures function is called at most once per frame
 * Useful for: smooth animations, scroll handlers
 */
export function rafThrottle<T extends (...args: unknown[]) => unknown>(
    func: T
): (...args: Parameters<T>) => void {
    let rafId: number | null = null

    return function executedFunction(...args: Parameters<T>) {
        if (rafId !== null) {
            return
        }

        rafId = requestAnimationFrame(() => {
            func(...args)
            rafId = null
        })
    }
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
    func: T
): T {
    const cache = new Map<string, ReturnType<T>>()

    return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args)
        if (cache.has(key)) {
            return cache.get(key)
        }

        const result = func(...args) as ReturnType<T>
        cache.set(key, result)
        return result
    }) as T
}

/**
 * Create a cancellable promise
 */
export function makeCancellable<T>(
    promise: Promise<T>
): {
    promise: Promise<T>
    cancel: () => void
} {
    let hasCancelled = false

    const wrappedPromise = new Promise<T>((resolve, reject) => {
        promise
            .then(val => (hasCancelled ? reject(new Error('Cancelled')) : resolve(val)))
            .catch(error => (hasCancelled ? reject(new Error('Cancelled')) : reject(error)))
    })

    return {
        promise: wrappedPromise,
        cancel() {
            hasCancelled = true
        }
    }
}

/**
 * Batch multiple function calls into a single execution
 */
export function batchCalls<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null
    const calls: Parameters<T>[] = []

    return function executedFunction(...args: Parameters<T>) {
        calls.push(args)

        if (timeout) {
            clearTimeout(timeout)
        }

        timeout = setTimeout(() => {
            const allCalls = [...calls]
            calls.length = 0
            allCalls.forEach(callArgs => func(...callArgs))
            timeout = null
        }, wait)
    }
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
    name: string,
    func: () => T | Promise<T>
): Promise<T> {
    const start = performance.now()
    try {
        const result = await func()
        const end = performance.now()
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`)
        return result
    } catch (error) {
        const end = performance.now()
        console.error(`[Performance] ${name} failed after ${(end - start).toFixed(2)}ms`, error)
        throw error
    }
}
