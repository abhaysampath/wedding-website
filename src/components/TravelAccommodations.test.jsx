import { render, screen } from '@testing-library/react'
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

import TravelAccommodations from './TravelAccommodations'

describe('TravelAccommodations', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: null,
      canSwitch: false,
      switchWedding: vi.fn(),
    })
  })

  it('renders section heading', () => {
    render(<TravelAccommodations />)
    expect(screen.getByText('Travel & Accommodations')).toBeTruthy()
  })

  it('renders hotel listings for US wedding', () => {
    render(<TravelAccommodations />)
    expect(screen.getByText(/Residence Inn/)).toBeTruthy()
  })

  it('renders transport section when data exists', () => {
    render(<TravelAccommodations />)
    expect(screen.getByText('Getting Here')).toBeTruthy()
    expect(screen.getByText(/By Car/)).toBeTruthy()
    expect(screen.getByText(/By Train/)).toBeTruthy()
    expect(screen.getByText(/By Air/)).toBeTruthy()
    expect(screen.getByText(/By Subway/)).toBeTruthy()
  })

  it('shows bride family hotels and message for bride family member (India)', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'india',
      user: { firstName: 'Rebecca' },
      canSwitch: true,
      switchWedding: vi.fn(),
    })
    render(<TravelAccommodations />)
    expect(screen.getByText('The Leela Palace Chennai')).toBeTruthy()
    expect(screen.getByText(/Recommended for the Bride's family/)).toBeTruthy()
  })

  it('shows general hotels for non-bride-family user (India)', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'india',
      user: { firstName: 'SomeOther' },
      canSwitch: true,
      switchWedding: vi.fn(),
    })
    render(<TravelAccommodations />)
    expect(screen.getByText('Taj Wellington Mews, Chennai')).toBeTruthy()
    expect(screen.getByText('Novotel Chennai Chamiers Road')).toBeTruthy()
    expect(screen.queryByText(/Recommended for the Bride's family/)).toBeNull()
  })

  it('renders WeddingSwitcher when user is signed in', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: { firstName: 'Jane' },
      canSwitch: true,
      switchWedding: vi.fn(),
    })
    render(<TravelAccommodations />)
    expect(screen.getByRole('radiogroup')).toBeTruthy()
    expect(screen.getByLabelText('US wedding (selected)')).toBeTruthy()
    expect(screen.getByLabelText('India wedding')).toBeTruthy()
  })

  it('renders without crashing when user is null', () => {
    render(<TravelAccommodations />)
    expect(screen.getByText('Travel & Accommodations')).toBeTruthy()
  })
})
