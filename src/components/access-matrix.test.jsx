import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'

// Keep tests fast: strip framer-motion down to plain elements.
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (target, prop) => {
        if (prop === 'useInView') return () => true
        return ({ children, ...props }) => {
          const {
            initial,
            animate,
            exit,
            whileHover,
            whileTap,
            variants,
            transition,
            layoutId,
            onAnimationComplete,
            ...rest
          } = props
          const tag = typeof prop === 'string' ? prop : 'div'
          return React.createElement(tag, rest, children)
        }
      },
    },
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
  useInView: () => true,
}))

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import ContactForm from './ContactForm'

const sideName = { bride: 'Rebecca', groom: 'Abhay' }

function makeUser(overrides = {}) {
  return {
    id: 'g132',
    firstName: 'Both',
    lastName: 'Weddings',
    side: 'bride',
    role: 'close_family',
    relationship: "Rebecca's Friend",
    phone: '15555550100',
    email: 'test-both@abhayandrebecca.com',
    address: '',
    dietaryPreferences: '',
    ...overrides,
  }
}

function renderForm(weddings) {
  mockUseAuth.mockReturnValue({
    setShowAuthModal: vi.fn(),
    switchWedding: vi.fn(),
    content: { guests: [], loaded: true },
  })
  return render(
    <ContactForm
      user={makeUser({ weddings })}
      authMode="settings"
      updateContact={vi.fn()}
      sideName={sideName}
    />,
  )
}

describe('Access matrix — RSVP options reflect invited weddings', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('guest invited to BOTH weddings sees US and India RSVP options', () => {
    renderForm(['us', 'india'])
    expect(screen.getByText('RSVP')).toBeTruthy()
    expect(screen.getByText('US Wedding — Bronx')).toBeTruthy()
    expect(screen.getByText('India Wedding — Chennai')).toBeTruthy()
  })

  it('guest invited to US only sees US and NOT India', () => {
    renderForm(['us'])
    expect(screen.getByText('US Wedding — Bronx')).toBeTruthy()
    expect(screen.queryByText('India Wedding — Chennai')).toBeNull()
  })

  it('guest invited to India only sees India and NOT US', () => {
    renderForm(['india'])
    expect(screen.getByText('India Wedding — Chennai')).toBeTruthy()
    expect(screen.queryByText('US Wedding — Bronx')).toBeNull()
  })

  it('guest with no weddings has no RSVP options', () => {
    renderForm([])
    expect(screen.queryByText('US Wedding — Bronx')).toBeNull()
    expect(screen.queryByText('India Wedding — Chennai')).toBeNull()
  })
})
