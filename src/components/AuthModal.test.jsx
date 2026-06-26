import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'

globalThis.Intl = globalThis.Intl || {}
globalThis.Intl.DateTimeFormat = class {
  formatToParts() {
    return [
      { type: 'year', value: '2026' },
      { type: 'month', value: '06' },
      { type: 'day', value: '08' },
      { type: 'hour', value: '12' },
      { type: 'minute', value: '00' },
      { type: 'second', value: '00' },
    ]
  }
}

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

vi.mock('../firebase', () => ({
  createAnonymousSession: vi.fn(),
  sendPhoneCode: vi.fn(() => ({ verificationId: 'test-vid' })),
  linkPhoneCredential: vi.fn(),
  getRecaptchaVerifier: vi.fn(() => ({})),
  clearRecaptchaVerifier: vi.fn(),
  signOutFirebase: vi.fn(),
  sendEmailSignInLink: vi.fn(),
  isEmailSignInLink: vi.fn(() => false),
  completeEmailLinkSignIn: vi.fn(),
}))

vi.mock('../utils/verifyEmail', () => ({
  sendVerificationCode: vi.fn(),
  verifyCodeServer: vi.fn(() => Promise.resolve({ valid: true })),
}))

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const baseContent = {
  guests: [
    {
      id: 'g001',
      firstName: 'Jane',
      lastName: 'Doe',
      side: 'bride',
      role: 'invited_guest',
      relationship: 'Cousin',
      phone: '5551234567',
      email: 'jane@example.com',
      weddings: ['us'],
    },
    {
      id: 'g002',
      firstName: 'John',
      lastName: 'Smith',
      side: 'groom',
      role: 'invited_guest',
      relationship: 'Friend',
      phone: '9876543210',
      email: 'john@example.com',
      weddings: ['us'],
    },
    {
      id: 'g003',
      firstName: 'Alice',
      lastName: 'Brown',
      side: 'bride',
      role: 'close_family',
      relationship: 'Sister',
      phone: '5550001111',
      email: 'alice@example.com',
      weddings: ['us', 'india'],
    },
  ],
  loaded: true,
}

function baseAuth() {
  return {
    showAuthModal: true,
    setShowAuthModal: vi.fn(),
    authMode: 'signin',
    setAuthMode: vi.fn(),
    user: null,
    config: {
      site: { coupleNames: { bride: 'Rebecca', groom: 'Abhay' } },
      sheets: { columns: {} },
    },
    firebaseLoading: false,
    firebaseError: null,
    setFirebaseError: vi.fn(),
    handleFirebaseSignIn: vi.fn(),
    signInAsGuest: vi.fn(),
    updateContact: vi.fn(),
    recordLogin: vi.fn(),
    recordLoginAttempt: vi.fn(),
    content: baseContent,
  }
}

import AuthModal from './AuthModal'

describe('AuthModal sign-in mode', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(baseAuth())
  })

  it('renders Google OAuth button', () => {
    render(<AuthModal />)
    expect(screen.getByText('Sign in with Google')).toBeTruthy()
  })

  it('shows dropdown with matching guests after 3 characters', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    expect(screen.getByText('Jane Doe')).toBeTruthy()
  })

  it('selects match with Enter key when one result', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.queryByPlaceholderText('Start typing your name')).toBeNull()
  })

  it('disables Google button when firebaseLoading is true', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth(), firebaseLoading: true })
    render(<AuthModal />)
    const googleBtn = screen.getByText('Sign in with Google').closest('button')
    expect(googleBtn.disabled).toBe(true)
  })

  it('displays firebaseError as an alert', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth(), firebaseError: 'Test error message' })
    render(<AuthModal />)
    expect(screen.getByText('Test error message')).toBeTruthy()
  })

  it('does not re-open after closing when URL has /g/<slug>', async () => {
    window.history.pushState({}, '', '/g/jane-doe')
    const replaceSpy = vi.spyOn(window.history, 'replaceState')

    mockUseAuth.mockReturnValue({
      ...baseAuth(),
      user: { id: 'g001', firstName: 'Jane', lastName: 'Doe', role: 'invited_guest' },
    })
    const { rerender } = render(<AuthModal />)

    await waitFor(() => {
      expect(replaceSpy).toHaveBeenCalled()
    })

    mockUseAuth.mockReturnValue({ ...baseAuth(), user: null, showAuthModal: false })
    rerender(<AuthModal />)

    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByPlaceholderText('Start typing your name')).toBeFalsy()

    replaceSpy.mockRestore()
    window.history.pushState({}, '', '/')
  })
})

describe('AuthModal welcome screen', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(baseAuth())
  })

  it('shows welcome message when signedIn is set', async () => {
    const signedInUser = {
      id: 'g001',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'invited_guest',
      side: 'bride',
      relationship: 'Cousin',
    }
    mockUseAuth.mockReturnValue({ ...baseAuth(), user: signedInUser })
    render(<AuthModal />)
    await waitFor(() => expect(screen.getByText(/Welcome.*Jane/)).toBeTruthy())
  })

  it('does not open sign-in modal when signed-in user lands on /g/<slug>', async () => {
    window.history.pushState({}, '', '/g/jane-doe')
    const signedInUser = {
      id: 'g001',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'invited_guest',
      side: 'bride',
      relationship: 'Cousin',
    }
    mockUseAuth.mockReturnValue({ ...baseAuth(), user: signedInUser, showAuthModal: false })
    render(<AuthModal />)

    await new Promise(r => setTimeout(r, 100))
    expect(screen.queryByPlaceholderText('Start typing your name')).toBeFalsy()
    expect(window.location.pathname).toBe('/')
    window.history.pushState({}, '', '/')
  })
})

describe('AuthModal settings mode', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(baseAuth())
  })

  it('renders ContactForm in settings mode when user exists', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth(),
      authMode: 'settings',
      user: {
        id: 'g001',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'invited_guest',
        side: 'bride',
        relationship: 'Cousin',
        phone: '5551234567',
        email: 'jane@example.com',
        weddings: ['us'],
      },
    })
    render(<AuthModal />)
    expect(screen.getByRole('status').textContent).toContain('Settings')
  })
})

describe('AuthModal phone & email verification', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(baseAuth())
  })

  it('shows phone and email inputs after selecting a guest', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    fireEvent.click(screen.getByText('Jane Doe'))
    const confirmButtons = screen.getAllByText('Confirm')
    expect(confirmButtons.length).toBe(2)
  })

  it('keeps phone and email fields visible when code is awaiting (no switching)', () => {
    sessionStorage.setItem('awaiting_email', '1')
    sessionStorage.setItem('email_sent_at', String(Date.now()))
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    fireEvent.click(screen.getByText('Jane Doe'))
    expect(screen.getByLabelText(/phone number/i)).toBeTruthy()
    expect(screen.getByLabelText(/email address/i)).toBeTruthy()
    sessionStorage.removeItem('awaiting_email')
    sessionStorage.removeItem('email_sent_at')
  })
})
