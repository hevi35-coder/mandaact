import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import Navigation from '../Navigation'
import { useAuthStore } from '@/store/authStore'

// Mock the auth store
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}))

// Mock useLocation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useLocation: vi.fn(),
  }
})

describe('Navigation', () => {
  const mockUser = { id: 'test-user', email: 'test@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Visibility', () => {
    it('should not render when user is not logged in', () => {
      vi.mocked(useAuthStore).mockReturnValue(null)
      vi.mocked(useLocation).mockReturnValue({ pathname: '/home' } as any)

      const { container } = render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render on auth pages', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)

      const authPaths = ['/', '/login', '/signup']

      authPaths.forEach(pathname => {
        vi.mocked(useLocation).mockReturnValue({ pathname } as any)

        const { container } = render(
          <BrowserRouter>
            <Navigation />
          </BrowserRouter>
        )

        expect(container.firstChild).toBeNull()
      })
    })

    it('should render when user is logged in and not on auth page', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)
      vi.mocked(useLocation).mockReturnValue({ pathname: '/home' } as any)

      render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      expect(screen.getByText('Manda')).toBeInTheDocument()
      expect(screen.getByText('Act')).toBeInTheDocument()
    })
  })

  describe('Navigation Items', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)
      vi.mocked(useLocation).mockReturnValue({ pathname: '/home' } as any)
    })

    it('should render all navigation items', () => {
      render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      expect(screen.getByText('홈')).toBeInTheDocument()
      expect(screen.getByText('투데이')).toBeInTheDocument()
      expect(screen.getByText('만다라트')).toBeInTheDocument()
      expect(screen.getByText('리포트')).toBeInTheDocument()
    })

    it('should have correct links', () => {
      render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      const homeLink = screen.getByText('홈').closest('a')
      const todayLink = screen.getByText('투데이').closest('a')
      const mandalartLink = screen.getByText('만다라트').closest('a')
      const reportLink = screen.getByText('리포트').closest('a')

      expect(homeLink).toHaveAttribute('href', '/home')
      expect(todayLink).toHaveAttribute('href', '/today')
      expect(mandalartLink).toHaveAttribute('href', '/mandalart/list')
      expect(reportLink).toHaveAttribute('href', '/reports')
    })

    it('should highlight active navigation item', () => {
      vi.mocked(useLocation).mockReturnValue({ pathname: '/today' } as any)

      render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      const todayButton = screen.getByText('투데이').closest('button')
      const homeButton = screen.getByText('홈').closest('button')

      expect(todayButton).toHaveClass('bg-primary')
      expect(homeButton).not.toHaveClass('bg-primary')
    })
  })

  describe('Responsive Layout', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)
      vi.mocked(useLocation).mockReturnValue({ pathname: '/home' } as any)
    })

    it('should have desktop navigation with correct classes', () => {
      const { container } = render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      const desktopNav = container.querySelector('nav.hidden.md\\:block')
      expect(desktopNav).toBeInTheDocument()
      expect(desktopNav).toHaveClass('sticky', 'top-0', 'z-50')
    })

    it('should have mobile navigation with correct classes', () => {
      const { container } = render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      const mobileNav = container.querySelector('nav.md\\:hidden')
      expect(mobileNav).toBeInTheDocument()
      expect(mobileNav).toHaveClass('fixed', 'bottom-0', 'z-50')
    })
  })

  describe('Logo', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue(mockUser)
      vi.mocked(useLocation).mockReturnValue({ pathname: '/home' } as any)
    })

    it('should render logo with gradient text', () => {
      render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      const mandaText = screen.getByText('Manda')
      const actText = screen.getByText('Act')

      expect(mandaText).toBeInTheDocument()
      expect(actText).toBeInTheDocument()
      expect(mandaText).toHaveClass('text-black')
      expect(actText).toHaveClass('bg-clip-text', 'text-transparent')
    })

    it('should link to home page', () => {
      render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      const mandaText = screen.getByText('Manda')
      const logoLink = mandaText.closest('a')
      expect(logoLink).toHaveAttribute('href', '/home')
    })
  })
})