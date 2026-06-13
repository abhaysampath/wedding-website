import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      return ({ children, ...props }) => {
        const { initial, animate, exit, whileHover, whileTap, variants, transition, layoutId, onAnimationComplete, ...rest } = props
        const tag = typeof prop === 'string' ? prop : 'div'
        return React.createElement(tag, rest, children)
      }
    },
  }),
}))

vi.mock('@emailjs/browser', () => ({
  default: { send: vi.fn() },
}))

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../config', () => ({
  default: {
    images: {
      hero: {
        contact: {
          reasons: [
            { value: 'wishes', label: 'Wishes to the Couple' },
            { value: 'travel', label: 'Questions about Travel/Visa' },
            { value: 'other', label: 'Other' },
          ],
        },
      },
    },
    emailjs: {
      serviceId: 'svc_test',
      templateId: 'tpl_test',
      contactTemplateId: '',
      publicKey: 'pk_test',
    },
    recaptcha: {
      siteKey: '',
    },
  },
}))

beforeEach(() => {
  mockUseAuth.mockReturnValue({ user: null })
  window.grecaptcha = { ready: (cb) => cb(), execute: () => Promise.resolve(null) }
  window.__recaptchaOnload = undefined
  const existing = document.querySelector('script[src*="recaptcha/api.js"]')
  if (existing) existing.remove()
  global.fetch = vi.fn(() => Promise.resolve({ ok: true }))
})

afterEach(cleanup)

describe('ContactSlide', () => {
  it('renders the contact form', async () => {
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    expect(screen.getByText('Get in Touch')).toBeTruthy()
    expect(screen.getByText("We'd love to hear from you")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
  })

  it('pre-fills user name and email when logged in', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'g001', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    })
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    expect(screen.getByPlaceholderText('Your name (optional)').value).toBe('Jane Doe')
    expect(screen.getByPlaceholderText('Your email (optional)').value).toBe('jane@example.com')
  })

  it('renders all reason options', async () => {
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    const options = screen.getByRole('combobox').querySelectorAll('option')
    expect(options.length).toBe(3)
    expect(options[0].textContent).toBe('Wishes to the Couple')
  })

  it('disables send button when message is empty', async () => {
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    expect(screen.getByRole('button', { name: 'Send' }).hasAttribute('disabled')).toBe(true)
  })

  it('enables send button when message is entered', async () => {
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    const textarea = screen.getByPlaceholderText('Your message...')
    fireEvent.change(textarea, { target: { value: 'Hello' } })
    expect(screen.getByRole('button', { name: 'Send' }).hasAttribute('disabled')).toBe(false)
  })

  it('sends email on submit and shows success', async () => {
    const emailjs = await import('@emailjs/browser')
    emailjs.default.send.mockResolvedValue({})
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    fireEvent.change(screen.getByPlaceholderText('Your message...'), { target: { value: 'Test message' } })
    screen.getByRole('button', { name: 'Send' }).click()
    await waitFor(() => {
      expect(screen.getByText('Thank You!')).toBeTruthy()
    })
  })

  it('shows "Send Another" after success', async () => {
    const emailjs = await import('@emailjs/browser')
    emailjs.default.send.mockResolvedValue({})
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    fireEvent.change(screen.getByPlaceholderText('Your message...'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => {
      expect(screen.getByText('Send Another')).toBeTruthy()
    })
  })

  it('handles pending-contact-msg event', async () => {
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    fireEvent(window, new CustomEvent('pending-contact-msg', { detail: 'Pending text' }))
    expect(screen.getByPlaceholderText('Your message...').value).toBe('Pending text')
  })

  it('handles pending-contact-msg with object detail', async () => {
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    fireEvent(window, new CustomEvent('pending-contact-msg', {
      detail: { reason: 'travel', message: 'Object msg' },
    }))
    expect(screen.getByPlaceholderText('Your message...').value).toBe('Object msg')
  })

  it('shows error state when emailjs fails', async () => {
    const emailjs = await import('@emailjs/browser')
    emailjs.default.send.mockRejectedValue(new Error('fail'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ContactSlide = (await import('./ContactSlide')).default
    render(<ContactSlide />)
    fireEvent.change(screen.getByPlaceholderText('Your message...'), { target: { value: 'Test' } })
    screen.getByRole('button', { name: 'Send' }).click()
    await waitFor(() => {
      expect(screen.getByText('Failed to send. Please try again later.')).toBeTruthy()
    })
    consoleSpy.mockRestore()
  })
})
