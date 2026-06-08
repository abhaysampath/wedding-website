import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContactForm from './ContactForm'

const defaultContent = {
  guests: [
    { id: 'g001', firstName: 'Jane', lastName: 'Doe', phone: '5551234567', email: 'jane@example.com' },
    { id: 'g002', firstName: 'John', lastName: 'Smith', phone: '9876543210', email: 'john@example.com' },
  ],
  loaded: true,
}

vi.mock('../context/useAuth', () => ({
  useAuth: vi.fn(() => ({
    setShowAuthModal: vi.fn(),
    content: defaultContent,
  })),
}))

import { useAuth } from '../context/useAuth'

beforeEach(() => {
  vi.mocked(useAuth).mockReset()
  vi.mocked(useAuth).mockReturnValue({
    setShowAuthModal: vi.fn(),
    content: defaultContent,
  })
})

const baseUser = {
  id: 'g001',
  firstName: 'Jane',
  lastName: 'Doe',
  side: 'bride',
  role: 'invited_guest',
  relationship: 'Cousin',
  phone: '5551234567',
  email: 'jane@example.com',
  address: '123 Main St, Springfield',
  dietaryPreferences: 'Vegetarian',
}

const sideName = { bride: 'Rebecca', groom: 'Abhay' }

describe('ContactForm', () => {
  it('renders user name and relationship', () => {
    render(<ContactForm user={baseUser} authMode="settings" updateContact={vi.fn()} sideName={sideName} />)
    expect(screen.getByText('Jane Doe')).toBeTruthy()
    expect(screen.getByDisplayValue('Cousin')).toBeTruthy()
  })

  it('pre-fills address and dietary preferences from user data', () => {
    render(<ContactForm user={baseUser} authMode="settings" updateContact={vi.fn()} sideName={sideName} />)
    expect(screen.getByDisplayValue('123 Main St, Springfield')).toBeTruthy()
    expect(screen.getByDisplayValue('Vegetarian')).toBeTruthy()
  })

  it('shows phone formatted and email masked when not focused', () => {
    render(<ContactForm user={baseUser} authMode="settings" updateContact={vi.fn()} sideName={sideName} />)
    expect(screen.getByDisplayValue('(555) 123-4567')).toBeTruthy()
    expect(screen.getByDisplayValue('j**e@example.com')).toBeTruthy()
  })

  it('shows empty fields when user data is missing', () => {
    const minimalUser = { id: 'g002', firstName: 'John', lastName: 'Smith', side: 'groom', role: 'invited_guest' }
    render(<ContactForm user={minimalUser} authMode="settings" updateContact={vi.fn()} sideName={sideName} />)
    expect(screen.getByPlaceholderText('123 Main St, City, State ZIP')).toBeTruthy()
    expect(screen.getByPlaceholderText('Any dietary restrictions or preferences')).toBeTruthy()
    expect(screen.getByPlaceholderText('5551234567')).toBeTruthy()
    expect(screen.getByPlaceholderText('you@email.com')).toBeTruthy()
  })

  it('shows Save buttons, Confirm, Close, and Message in settings mode', () => {
    render(<ContactForm user={baseUser} authMode="settings" updateContact={vi.fn()} sideName={sideName} />)
    const saveButtons = screen.getAllByText('Save')
    expect(saveButtons.length).toBe(2)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Message' })).toBeTruthy()
  })

  it('renders description text for contact mode', () => {
    render(<ContactForm user={baseUser} authMode="contact" updateContact={vi.fn()} sideName={sideName} />)
    expect(screen.getByText('Add your contact info so we can send you wedding updates.')).toBeTruthy()
  })

  it('populates phone and email from content.guests when user has empty contact fields', () => {
    const userNoContact = {
      id: 'g001', firstName: 'Jane', lastName: 'Doe',
      side: 'bride', role: 'invited_guest', relationship: 'Cousin',
      phone: '', email: '',
    }
    render(<ContactForm user={userNoContact} authMode="settings" updateContact={vi.fn()} sideName={sideName} />)
    expect(screen.getByDisplayValue('(555) 123-4567')).toBeTruthy()
    expect(screen.getByDisplayValue('j**e@example.com')).toBeTruthy()
  })

  it('shows placeholders when both user and content.guests have empty phone/email', () => {
    const userNoContact = {
      id: 'g003', firstName: 'Alice', lastName: 'Brown',
      side: 'bride', role: 'invited_guest', relationship: 'Friend',
      phone: '', email: '',
    }
    render(<ContactForm user={userNoContact} authMode="settings" updateContact={vi.fn()} sideName={sideName} />)
    expect(screen.getByPlaceholderText('5551234567')).toBeTruthy()
    expect(screen.getByPlaceholderText('you@email.com')).toBeTruthy()
  })

  it('populates phone and email from content when it loads after initial mount', async () => {
    const userNoContact = {
      id: 'g001', firstName: 'Jane', lastName: 'Doe',
      side: 'bride', role: 'invited_guest', relationship: 'Cousin',
      phone: '', email: '',
    }
    const emptyContent = { guests: [], loaded: true }
    vi.mocked(useAuth).mockReturnValueOnce({
      setShowAuthModal: vi.fn(),
      content: emptyContent,
    })
    const { rerender } = render(
      <ContactForm user={userNoContact} authMode="settings" updateContact={vi.fn()} sideName={sideName} />
    )
    expect(screen.getByPlaceholderText('5551234567')).toBeTruthy()
    expect(screen.getByPlaceholderText('you@email.com')).toBeTruthy()

    vi.mocked(useAuth).mockReturnValueOnce({
      setShowAuthModal: vi.fn(),
      content: defaultContent,
    })
    rerender(<ContactForm user={userNoContact} authMode="settings" updateContact={vi.fn()} sideName={sideName} />)
    expect(await screen.findByDisplayValue('(555) 123-4567')).toBeTruthy()
    expect(await screen.findByDisplayValue('j**e@example.com')).toBeTruthy()
  })
})
