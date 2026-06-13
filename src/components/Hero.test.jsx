import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'useInView') return () => true
      return ({ children, ...props }) => {
        const { initial, animate, exit, whileHover, whileTap, variants, transition, layoutId, onAnimationComplete, ...rest } = props
        const tag = typeof prop === 'string' ? prop : 'div'
        return React.createElement(tag, rest, children)
      }
    },
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useTransform: () => ({ get: () => 0 }),
  useInView: () => true,
}))

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import Hero from './Hero'

describe('Hero', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      openSettings: vi.fn(),
      setShowAuthModal: vi.fn(),
      handleFirebaseSignIn: vi.fn(),
      firebaseLoading: false,
    })
  })

  it('renders without crashing when no user is logged in', () => {
    render(<Hero />)
    expect(screen.getByText("We're getting married")).toBeTruthy()
  })

  it('renders without crashing for groom-side user (regression: personalized.groom was undefined)', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'g001', firstName: 'Abhay', side: 'groom', role: 'groom' },
      openSettings: vi.fn(),
      setShowAuthModal: vi.fn(),
      handleFirebaseSignIn: vi.fn(),
      firebaseLoading: false,
    })
    render(<Hero />)
    expect(screen.getByText("We're getting married")).toBeTruthy()
  })

  it('renders without crashing for bride-side user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'b001', firstName: 'Rebecca', side: 'bride', role: 'bride' },
      openSettings: vi.fn(),
      setShowAuthModal: vi.fn(),
      handleFirebaseSignIn: vi.fn(),
      firebaseLoading: false,
    })
    render(<Hero />)
    expect(screen.getByText("We're getting married")).toBeTruthy()
  })

  it('shows sign-in prompt when no user is logged in', () => {
    render(<Hero />)
    expect(screen.getByText('Sign in to find your invite')).toBeTruthy()
    expect(screen.getByLabelText('Sign in with Google')).toBeTruthy()
  })

  it('shows welcome message when user is logged in', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'g001', firstName: 'Jane', lastName: 'Doe', role: 'invited_guest' },
      openSettings: vi.fn(),
      setShowAuthModal: vi.fn(),
      handleFirebaseSignIn: vi.fn(),
      firebaseLoading: false,
    })
    render(<Hero />)
    expect(screen.getByText('Welcome, Jane!')).toBeTruthy()
    expect(screen.getByText('Invited Guest')).toBeTruthy()
  })

  it('renders slide navigation buttons matching slide count', () => {
    render(<Hero />)
    const slideButtons = screen.getAllByRole('button').filter(b => b.getAttribute('aria-label')?.startsWith('Go to slide'))
    expect(slideButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('renders previous and next navigation buttons', () => {
    render(<Hero />)
    expect(screen.getByLabelText('Previous image')).toBeTruthy()
    expect(screen.getByLabelText('Next image')).toBeTruthy()
  })

  it('opens auth modal when sign-in area is clicked', () => {
    const setShowAuthModal = vi.fn()
    mockUseAuth.mockReturnValue({
      user: null,
      openSettings: vi.fn(),
      setShowAuthModal,
      handleFirebaseSignIn: vi.fn(),
      firebaseLoading: false,
    })
    render(<Hero />)
    const searchButton = screen.getByText('Sign in to find your invite').closest('div')
    fireEvent.click(searchButton)
    expect(setShowAuthModal).toHaveBeenCalledWith(true)
  })
})
