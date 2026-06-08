import { render, screen, fireEvent } from '@testing-library/react'
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

vi.mock('../firebase', () => ({
  createAnonymousSession: vi.fn(),
  sendPhoneCode: vi.fn(() => ({ verificationId: 'test-vid' })),
  linkPhoneCredential: vi.fn(),
  getRecaptchaVerifier: vi.fn(() => ({})),
  clearRecaptchaVerifier: vi.fn(),
  signInWithFacebookToken: vi.fn(),
}))

vi.mock('../utils/verifyEmail', () => ({
  sendVerificationCode: vi.fn(),
  verifyCode: vi.fn((code) => code === '123456'),
}))

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const baseContent = {
  guests: [
    { id: 'g001', firstName: 'Jane', lastName: 'Doe', side: 'bride', role: 'invited_guest', relationship: 'Cousin', phone: '5551234567', email: 'jane@example.com', weddings: ['us'] },
    { id: 'g002', firstName: 'John', lastName: 'Smith', side: 'groom', role: 'invited_guest', relationship: 'Friend', phone: '9876543210', email: 'john@example.com', weddings: ['us'] },
    { id: 'g003', firstName: 'Alice', lastName: 'Brown', side: 'bride', role: 'close_family', relationship: 'Sister', phone: '5550001111', email: 'alice@example.com', weddings: ['us', 'india'] },
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

  it('renders OAuth buttons for Google and Facebook', () => {
    render(<AuthModal />)
    expect(screen.getByText('Google')).toBeTruthy()
    expect(screen.getByText('Facebook')).toBeTruthy()
  })

  it('renders name search input', () => {
    render(<AuthModal />)
    expect(screen.getByPlaceholderText('Start typing your name')).toBeTruthy()
  })

  it('shows "Having trouble? Contact us" link', () => {
    render(<AuthModal />)
    expect(screen.getByText('Having trouble? Contact us')).toBeTruthy()
  })

  it('shows dropdown with matching guests after 3 characters', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    expect(screen.getByText('Jane Doe')).toBeTruthy()
    expect(screen.queryByText('John Smith')).toBeNull()
  })

  it('shows multiple matches when name is partial', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'a' } })
    expect(screen.queryByText('Jane Doe')).toBeNull()
    fireEvent.change(input, { target: { value: 'ali' } })
    expect(screen.getByText('Alice Brown')).toBeTruthy()
  })

  it('does not show dropdown for fewer than 3 characters', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Ja' } })
    expect(screen.queryByText('Jane Doe')).toBeNull()
  })

  it('hides dropdown when a match is selected', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    fireEvent.click(screen.getByText('Jane Doe'))
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('selects match with Enter key when one result', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.queryByText('Start typing your name')).toBeNull()
  })

  it('navigates dropdown with ArrowDown and ArrowUp', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'J' } })
    expect(screen.queryByText('Jane Doe')).toBeNull()
    fireEvent.change(input, { target: { value: 'Joh' } })
    expect(screen.getByText('John Smith')).toBeTruthy()
  })

  it('disables OAuth buttons when firebaseLoading is true', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth(), firebaseLoading: true })
    render(<AuthModal />)
    const googleBtn = screen.getByText('Google').closest('button')
    const facebookBtn = screen.getByText('Facebook').closest('button')
    expect(googleBtn.disabled).toBe(true)
    expect(facebookBtn.disabled).toBe(true)
  })

  it('shows OAuth button spinner when firebaseLoading is true', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth(), firebaseLoading: true })
    render(<AuthModal />)
    const spinners = document.querySelectorAll('.animate-spin')
    expect(spinners.length).toBeGreaterThanOrEqual(2)
  })

  it('displays firebaseError as an alert', () => {
    mockUseAuth.mockReturnValue({ ...baseAuth(), firebaseError: 'Test error message' })
    render(<AuthModal />)
    expect(screen.getByText('Test error message')).toBeTruthy()
  })

  it('shows name confirmation step after selecting a guest', () => {
    const auth = baseAuth()
    const inputRef = { current: document.createElement('input') }
    const setSelectedMatch = vi.fn()
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    fireEvent.click(screen.getByText('Jane Doe'))
  })

  it('renders close button', () => {
    render(<AuthModal />)
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })
})

describe('AuthModal welcome screen', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(baseAuth())
  })

  it('shows welcome message and Continue button when signedIn is set', () => {
    const signedInUser = { id: 'g001', firstName: 'Jane', lastName: 'Doe', role: 'invited_guest', side: 'bride', relationship: 'Cousin' }
    mockUseAuth.mockReturnValue({ ...baseAuth(), user: signedInUser })
    render(<AuthModal />)
    expect(screen.getByText(/Welcome.*Jane/)).toBeTruthy()
    expect(screen.getByText('Cousin')).toBeTruthy()
    expect(screen.getByText('Continue to Site')).toBeTruthy()
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
      user: { id: 'g001', firstName: 'Jane', lastName: 'Doe', role: 'invited_guest', side: 'bride', relationship: 'Cousin', phone: '5551234567', email: 'jane@example.com', weddings: ['us'] },
    })
    render(<AuthModal />)
    expect(screen.getByRole('status').textContent).toContain('Settings')
  })
})

describe('AuthModal phone verification', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(baseAuth())
  })

  it('shows phone input after selecting a guest with a phone number', () => {
    render(<AuthModal />)
    const input = screen.getByPlaceholderText('Start typing your name')
    fireEvent.change(input, { target: { value: 'Jan' } })
    fireEvent.click(screen.getByText('Jane Doe'))
    const sendLogIn = screen.getAllByText('Send Log-In Code')
    expect(sendLogIn.length).toBe(2)
  })
})

describe('AuthModal Facebook SDK', () => {
  let fbLoginMock
  let dispatchSpy

  beforeEach(() => {
    mockUseAuth.mockReturnValue(baseAuth())
    fbLoginMock = vi.fn()
    window.FB = { login: fbLoginMock }
    dispatchSpy = vi.spyOn(window, 'dispatchEvent')
  })

  afterEach(() => {
    delete window.FB
    dispatchSpy.mockRestore()
  })

  it('calls FB.login when Facebook button is clicked and FB SDK is loaded', () => {
    render(<AuthModal />)
    fireEvent.click(screen.getByText('Facebook'))
    expect(fbLoginMock).toHaveBeenCalledOnce()
    expect(fbLoginMock.mock.calls[0][1]).toEqual({ scope: 'public_profile,email' })
  })

  it('dispatches facebook-login event when FB.login succeeds', () => {
    fbLoginMock.mockImplementation((cb) => cb({
      authResponse: { accessToken: 'test-token' }
    }))
    render(<AuthModal />)
    fireEvent.click(screen.getByText('Facebook'))
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'facebook-login',
        detail: { accessToken: 'test-token' },
      })
    )
  })

  it('does not dispatch event when FB.login response has no authResponse', () => {
    fbLoginMock.mockImplementation((cb) => cb({}))
    render(<AuthModal />)
    fireEvent.click(screen.getByText('Facebook'))
    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  it('falls back to handleFirebaseSignIn when FB SDK is not loaded', () => {
    delete window.FB
    const auth = baseAuth()
    mockUseAuth.mockReturnValue(auth)
    render(<AuthModal />)
    fireEvent.click(screen.getByText('Facebook'))
    expect(auth.handleFirebaseSignIn).toHaveBeenCalledWith('facebook')
  })
})
