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

      // Both desktop and mobile navigation should render
      const mandaElements = screen.getAllByText('Manda')
      const actElements = screen.getAllByText('Act')
      expect(mandaElements.length).toBeGreaterThan(0)
      expect(actElements.length).toBeGreaterThan(0)
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

      // Each nav item appears twice (desktop + mobile)
      expect(screen.getAllByText('홈').length).toBe(2)
      expect(screen.getAllByText('투데이').length).toBe(2)
      expect(screen.getAllByText('만다라트').length).toBe(2)
      expect(screen.getAllByText('리포트').length).toBe(2)
    })

    it('should have correct links', () => {
      render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      // Get first occurrence (desktop navigation)
      const homeLink = screen.getAllByText('홈')[0].closest('a')
      const todayLink = screen.getAllByText('투데이')[0].closest('a')
      const mandalartLink = screen.getAllByText('만다라트')[0].closest('a')
      const reportLink = screen.getAllByText('리포트')[0].closest('a')

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

      // Get desktop navigation buttons
      const todayButtons = screen.getAllByText('투데이')
      const homeButtons = screen.getAllByText('홈')

      // Check desktop navigation (first occurrence)
      const todayButton = todayButtons[0].closest('button')
      const homeButton = homeButtons[0].closest('button')

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

      // Mobile has two nav elements: header (sticky top) and bottom navigation
      const mobileNavs = container.querySelectorAll('nav.md\\:hidden')
      expect(mobileNavs.length).toBeGreaterThan(0)

      // Check bottom navigation
      const bottomNav = Array.from(mobileNavs).find(nav => nav.classList.contains('fixed'))
      expect(bottomNav).toBeInTheDocument()
      expect(bottomNav).toHaveClass('bottom-0', 'z-50')
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

      const mandaTexts = screen.getAllByText('Manda')
      const actTexts = screen.getAllByText('Act')

      // Check desktop logo (first occurrence)
      expect(mandaTexts[0]).toHaveClass('text-black')
      expect(actTexts[0]).toHaveClass('bg-clip-text', 'text-transparent')
    })

    it('should link to home page', () => {
      render(
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      )

      // Get desktop logo (first occurrence)
      const mandaTexts = screen.getAllByText('Manda')
      const logoLink = mandaTexts[0].closest('a')
      expect(logoLink).toHaveAttribute('href', '/home')
    })
  })
})