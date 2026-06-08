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
    expect(screen.getByText('Our Story')).toBeTruthy()
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
    expect(screen.getByText('Jane Doe')).toBeTruthy()
    expect(screen.getByText('Invited Guest')).toBeTruthy()
  })

  it('renders two AR logo images (desktop + mobile)', () => {
    render(<Navbar />)
    const logos = screen.getAllByAltText('AR')
    expect(logos.length).toBe(2)
    expect(logos[0].getAttribute('src')).toContain('ar-logo.png')
  })

  it('toggles to full text on logo click', () => {
    render(<Navbar />)
    expect(screen.queryByText('Abhay & Rebecca')).toBeNull()
    const buttons = screen.getAllByRole('button')
    const logoButton = buttons.find(b => b.className.includes('font-heading'))
    expect(logoButton).toBeTruthy()
    if (logoButton) {
      fireEvent.click(logoButton)
      const texts = screen.getAllByText('Abhay & Rebecca')
      expect(texts.length).toBe(2)
    }
  })
})
