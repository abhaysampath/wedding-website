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

import WeddingSwitcher from './WeddingSwitcher'

describe('WeddingSwitcher', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      switchWedding: vi.fn(),
      canSwitch: true,
      user: { id: 'g001' },
    })
  })

  it('returns null when canSwitch is false', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      switchWedding: vi.fn(),
      canSwitch: false,
      user: { id: 'g001' },
    })
    const { container } = render(<WeddingSwitcher />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when user is null', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      switchWedding: vi.fn(),
      canSwitch: true,
      user: null,
    })
    const { container } = render(<WeddingSwitcher />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when both canSwitch is false and user is null', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      switchWedding: vi.fn(),
      canSwitch: false,
      user: null,
    })
    const { container } = render(<WeddingSwitcher />)
    expect(container.innerHTML).toBe('')
  })

  it('renders US wedding label and venue when activeWedding is us', () => {
    render(<WeddingSwitcher />)
    expect(screen.getByText('US Wedding')).toBeTruthy()
    expect(screen.getByText(/The Stone Mill at New York Botanical Garden/)).toBeTruthy()
    expect(screen.getByText(/Sunday, May 30, 2027/)).toBeTruthy()
  })

  it('renders India wedding label and venue when activeWedding is india', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'india',
      switchWedding: vi.fn(),
      canSwitch: true,
      user: { id: 'g001' },
    })
    render(<WeddingSwitcher />)
    expect(screen.getByText('India Wedding')).toBeTruthy()
    expect(screen.getByText(/Dwaraka Palace/)).toBeTruthy()
    expect(screen.getByText(/Thursday, February 25, 2027/)).toBeTruthy()
  })

  it('renders both US and India toggle buttons', () => {
    render(<WeddingSwitcher />)
    expect(screen.getByText('US')).toBeTruthy()
    expect(screen.getByText('India')).toBeTruthy()
  })

  it('marks the active wedding button as aria-checked', () => {
    render(<WeddingSwitcher />)
    expect(screen.getByLabelText('US wedding (selected)')).toBeTruthy()
    expect(screen.getByLabelText('India wedding')).toBeTruthy()
  })

  it('calls switchWedding with "india" when India button is clicked', () => {
    const switchWedding = vi.fn()
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      switchWedding,
      canSwitch: true,
      user: { id: 'g001' },
    })
    render(<WeddingSwitcher />)
    fireEvent.click(screen.getByLabelText('India wedding'))
    expect(switchWedding).toHaveBeenCalledWith('india')
  })

  it('calls switchWedding with "us" when US button is clicked while India is active', () => {
    const switchWedding = vi.fn()
    mockUseAuth.mockReturnValue({
      activeWedding: 'india',
      switchWedding,
      canSwitch: true,
      user: { id: 'g001' },
    })
    render(<WeddingSwitcher />)
    fireEvent.click(screen.getByLabelText('US wedding'))
    expect(switchWedding).toHaveBeenCalledWith('us')
  })

  it('renders a radiogroup with correct aria label', () => {
    render(<WeddingSwitcher />)
    expect(screen.getByRole('radiogroup', { name: 'Select wedding' })).toBeTruthy()
  })
})
