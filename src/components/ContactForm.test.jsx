import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContactForm from './ContactForm'

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    setShowAuthModal: vi.fn(),
  }),
}))

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
})
