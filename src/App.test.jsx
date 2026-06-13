import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'

vi.mock('framer-motion', () => ({
  MotionConfig: ({ children }) => <>{children}</>,
  motion: new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'useInView') return () => true
      if (prop === 'useScroll') return () => ({ scrollY: { get: () => 0 } })
      if (prop === 'useTransform') return () => ({ get: () => 0 })
      return ({ children, ...props }) => {
        const { initial, animate, exit, whileHover, whileTap, variants, transition, layoutId, onAnimationComplete, ...rest } = props
        const tag = typeof prop === 'string' ? prop : 'div'
        return React.createElement(tag, rest, children)
      }
    },
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
}))

vi.mock('@vercel/speed-insights/react', () => ({ SpeedInsights: () => null }))
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }))

const mockUseAuth = vi.fn()
vi.mock('./context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('./context/AuthProvider', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
}))

vi.mock('./components/Navbar', () => ({ default: () => <nav data-testid="navbar">Nav</nav> }))
vi.mock('./components/Hero', () => ({ default: () => <section data-testid="hero">Hero</section> }))
vi.mock('./components/Gallery', () => ({ default: () => <section data-testid="gallery">Gallery</section> }))
vi.mock('./components/OurStory', () => ({ default: () => <section data-testid="our-story">OurStory</section> }))
vi.mock('./components/EventDetails', () => ({ default: () => <section data-testid="event-details">EventDetails</section> }))
vi.mock('./components/TravelAccommodations', () => ({ default: () => <section data-testid="travel">Travel</section> }))
vi.mock('./components/FAQ', () => ({ default: () => <section data-testid="faq">FAQ</section> }))
vi.mock('./components/ContactSection', () => ({ default: () => <section data-testid="contact">Contact</section> }))
vi.mock('./components/Footer', () => ({ default: () => <footer data-testid="footer">Footer</footer> }))
vi.mock('./components/AuthModal', () => ({ default: () => <div data-testid="auth-modal">AuthModal</div> }))

const originalScrollTo = window.scrollTo

beforeEach(() => {
  window.IntersectionObserver = vi.fn(function () {
    this.observe = vi.fn()
    this.disconnect = vi.fn()
    this.unobserve = vi.fn()
  })
  window.scrollTo = vi.fn()
  mockUseAuth.mockReturnValue({
    user: null,
    activeWedding: 'us',
    setShowAuthModal: vi.fn(),
    setAuthMode: vi.fn(),
    signOut: vi.fn(),
    handleFirebaseSignIn: vi.fn(),
    firebaseLoading: false,
  })
})

afterEach(() => {
  window.scrollTo = originalScrollTo
  cleanup()
})

describe('App', () => {
  it('renders Hero and Navbar', async () => {
    const App = (await import('./App')).default
    render(<App />)
    expect(screen.getByTestId('navbar')).toBeTruthy()
    expect(screen.getByTestId('hero')).toBeTruthy()
  })

  it('renders gallery lazily', async () => {
    const App = (await import('./App')).default
    render(<App />)
    expect(await screen.findByTestId('gallery')).toBeTruthy()
  })

  it('renders ContactSection lazily', async () => {
    const App = (await import('./App')).default
    render(<App />)
    expect(await screen.findByTestId('contact')).toBeTruthy()
  })

  it('does not show auth-gated sections when no user', async () => {
    const App = (await import('./App')).default
    render(<App />)
    await screen.findByTestId('gallery')
    expect(screen.queryByTestId('our-story')).toBeNull()
    expect(screen.queryByTestId('event-details')).toBeNull()
    expect(screen.queryByTestId('travel')).toBeNull()
    expect(screen.queryByTestId('faq')).toBeNull()
    expect(screen.queryByTestId('footer')).toBeNull()
  })

  it('shows auth-gated sections when user is logged in', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'g001', firstName: 'Jane', role: 'invited_guest' },
      activeWedding: 'us',
      setShowAuthModal: vi.fn(),
      setAuthMode: vi.fn(),
      signOut: vi.fn(),
      handleFirebaseSignIn: vi.fn(),
      firebaseLoading: false,
    })
    const App = (await import('./App')).default
    render(<App />)
    expect(await screen.findByTestId('our-story')).toBeTruthy()
    expect(await screen.findByTestId('event-details')).toBeTruthy()
    expect(await screen.findByTestId('travel')).toBeTruthy()
    expect(await screen.findByTestId('faq')).toBeTruthy()
    expect(await screen.findByTestId('footer')).toBeTruthy()
  })

  it('renders AuthModal', async () => {
    const App = (await import('./App')).default
    render(<App />)
    expect(screen.getByTestId('auth-modal')).toBeTruthy()
  })

  it('has skip-to-content link', async () => {
    const App = (await import('./App')).default
    render(<App />)
    expect(screen.getByText('Skip to content').getAttribute('href')).toBe('#gallery')
  })

  it('renders section navigation dots for logged-in user', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'g001', firstName: 'Jane', role: 'invited_guest' },
      activeWedding: 'us',
      setShowAuthModal: vi.fn(),
      setAuthMode: vi.fn(),
      signOut: vi.fn(),
    })
    const App = (await import('./App')).default
    render(<App />)
    const nav = screen.getByLabelText('Section navigation')
    expect(nav).toBeTruthy()
    expect(nav.querySelectorAll('button').length).toBeGreaterThan(0)
  })

  it('renders bottom nav for logged-in user', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'g001', firstName: 'Jane', role: 'invited_guest' },
      activeWedding: 'us',
      setShowAuthModal: vi.fn(),
      setAuthMode: vi.fn(),
      signOut: vi.fn(),
    })
    const App = (await import('./App')).default
    render(<App />)
    expect(screen.getByLabelText('Bottom navigation')).toBeTruthy()
  })

  it('shows scroll progress bar', async () => {
    const App = (await import('./App')).default
    render(<App />)
    expect(document.querySelector('.bg-gold')).toBeTruthy()
  })
})
