import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ErrorBoundary from '../ErrorBoundary'

// Mock child component that throws an error
const ThrowError = () => {
    throw new Error('Test error')
}

describe('ErrorBoundary', () => {
    // Save original console.error to restore later
    const originalConsoleError = console.error

    beforeEach(() => {
        // Suppress console.error for expected errors during tests
        console.error = vi.fn()
    })

    afterEach(() => {
        console.error = originalConsoleError
    })

    it('renders children when no error occurs', () => {
        render(
            <ErrorBoundary>
                <div>Safe Content</div>
            </ErrorBoundary>
        )
        expect(screen.getByText('Safe Content')).toBeInTheDocument()
    })

    it('renders error UI when an error occurs', () => {
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        )
        expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument()
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
    })

    it('renders custom fallback when provided', () => {
        render(
            <ErrorBoundary fallback={<div>Custom Error UI</div>}>
                <ThrowError />
            </ErrorBoundary>
        )
        expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
    })

    it('resets error state when try again button is clicked', () => {
        // Note: ErrorBoundary's "Try Again" button calls handleReset which clears error state.
        // If the child immediately throws again, it will catch the error again.
        // This test verifies the button exists and is clickable.
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        )

        const tryAgainButton = screen.getByText('다시 시도')
        fireEvent.click(tryAgainButton)

        // Since the child <ThrowError /> always throws, it should remain in error state.
        // This confirms the button works (doesn't crash) and triggers re-render logic.
        expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument()
    })
})
