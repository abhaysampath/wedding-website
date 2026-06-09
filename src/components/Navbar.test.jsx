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
  useInView: () => true,
}))

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import Navbar from './Navbar'

describe('Navbar', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      setShowAuthModal: vi.fn(),
      setAuthMode: vi.fn(),
      signOut: vi.fn(),
    })
  })

  it('renders navigation element', () => {
    render(<Navbar />)
    expect(screen.getByRole('navigation')).toBeTruthy()
  })

  it('shows guest links when no user is signed in', () => {
    render(<Navbar />)
    expect(screen.queryByText('Our Story')).toBeNull()
    expect(screen.getByText('Gallery')).toBeTruthy()
  })

  it('shows auth links when user is signed in', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'g001', firstName: 'Jane', lastName: 'Doe', role: 'invited_guest' },
      setShowAuthModal: vi.fn(),
      setAuthMode: vi.fn(),
      signOut: vi.fn(),
    })
    render(<Navbar />)
    expect(screen.getByText('Event Details')).toBeTruthy()
    expect(screen.getByText('Travel')).toBeTruthy()
    expect(screen.getByText('Registry')).toBeTruthy()
    expect(screen.getByText('FAQ')).toBeTruthy()
  })

  it('shows user name when signed in', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'g001', firstName: 'Jane', lastName: 'Doe', role: 'invited_guest' },
      setShowAuthModal: vi.fn(),
      setAuthMode: vi.fn(),
      signOut: vi.fn(),
    })
    render(<Navbar />)
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Invited Guest').length).toBeGreaterThanOrEqual(1)
  })

  it('renders two AR logo images (desktop + mobile)', () => {
    render(<Navbar />)
    const logos = screen.getAllByAltText('AR')
    expect(logos.length).toBe(2)
    expect(logos[0].getAttribute('src')).toContain('ar-logo.png')
    expect(logos[0].className).toContain('h-12')
  })

  it('opens auth modal on logo click', () => {
    const setShowAuthModal = vi.fn()
    const setAuthMode = vi.fn()
    mockUseAuth.mockReturnValue({
      user: null,
      setShowAuthModal,
      setAuthMode,
      signOut: vi.fn(),
    })
    render(<Navbar />)
    const buttons = screen.getAllByRole('button')
    const logoButton = buttons.find(b => b.className.includes('font-heading'))
    expect(logoButton).toBeTruthy()
    if (logoButton) {
      fireEvent.click(logoButton)
      expect(setShowAuthModal).toHaveBeenCalledWith(true)
    }
  })
})
