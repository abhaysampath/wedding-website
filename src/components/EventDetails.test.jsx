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

vi.mock('./WeddingSwitcher', () => ({
  default: () => null,
}))

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import EventDetails from './EventDetails'

describe('EventDetails role-based filtering', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: null,
    })
  })

  it('renders section heading and venue', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: null,
    })
    render(<EventDetails />)
    expect(screen.getByText('Event Details')).toBeTruthy()
    expect(screen.getByText('The Stone Mill at New York Botanical Garden')).toBeTruthy()
  })

  it('shows all 7 events for bride', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: { role: 'bride' },
    })
    render(<EventDetails />)
    expect(screen.getByText('Vendor Access to Venue')).toBeTruthy()
    expect(screen.getByText('Couple Access to Venue for Photography')).toBeTruthy()
    expect(screen.getByText('Guest Arrival')).toBeTruthy()
    expect(screen.getByText('Ceremony')).toBeTruthy()
    expect(screen.getByText('Cocktail Hour')).toBeTruthy()
    expect(screen.getByText('Reception')).toBeTruthy()
    expect(screen.getByText('Vendor Load Out')).toBeTruthy()
  })

  it('shows all 7 events for groom', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: { role: 'groom' },
    })
    render(<EventDetails />)
    expect(screen.getByText('Vendor Access to Venue')).toBeTruthy()
    expect(screen.getByText('Couple Access to Venue for Photography')).toBeTruthy()
    expect(screen.getByText('Guest Arrival')).toBeTruthy()
    expect(screen.getByText('Ceremony')).toBeTruthy()
    expect(screen.getByText('Cocktail Hour')).toBeTruthy()
    expect(screen.getByText('Reception')).toBeTruthy()
    expect(screen.getByText('Vendor Load Out')).toBeTruthy()
  })

  it('shows 5 events for close_family (not Vendor Access or Vendor Load Out)', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: { role: 'close_family' },
    })
    render(<EventDetails />)
    expect(screen.getByText('Couple Access to Venue for Photography')).toBeTruthy()
    expect(screen.getByText('Guest Arrival')).toBeTruthy()
    expect(screen.getByText('Ceremony')).toBeTruthy()
    expect(screen.getByText('Cocktail Hour')).toBeTruthy()
    expect(screen.getByText('Reception')).toBeTruthy()

    expect(screen.queryByText('Vendor Access to Venue')).toBeNull()
    expect(screen.queryByText('Vendor Load Out')).toBeNull()
  })

  it('shows all events accessible to vendor', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: { role: 'vendor' },
    })
    render(<EventDetails />)
    expect(screen.getByText('Vendor Access to Venue')).toBeTruthy()
    expect(screen.getByText('Couple Access to Venue for Photography')).toBeTruthy()
    expect(screen.getByText('Guest Arrival')).toBeTruthy()
    expect(screen.getByText('Ceremony')).toBeTruthy()
    expect(screen.getByText('Cocktail Hour')).toBeTruthy()
    expect(screen.getByText('Reception')).toBeTruthy()
    expect(screen.getByText('Vendor Load Out')).toBeTruthy()
  })

  it('shows Vendor badge on vendor-highlighted events for vendor user', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: { role: 'vendor' },
    })
    render(<EventDetails />)
    const vendorBadges = screen.getAllByText('Vendor')
    expect(vendorBadges.length).toBe(2)
  })

  it('shows only Guest Arrival through Reception for invited_guest', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: { role: 'invited_guest' },
    })
    render(<EventDetails />)

    expect(screen.getByText('Guest Arrival')).toBeTruthy()
    expect(screen.getByText('Ceremony')).toBeTruthy()
    expect(screen.getByText('Cocktail Hour')).toBeTruthy()
    expect(screen.getByText('Reception')).toBeTruthy()

    expect(screen.queryByText('Vendor Access to Venue')).toBeNull()
    expect(screen.queryByText('Couple Access to Venue for Photography')).toBeNull()
    expect(screen.queryByText('Vendor Load Out')).toBeNull()
  })

  it('shows only Guest Arrival through Reception for unauthenticated user', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: null,
    })
    render(<EventDetails />)

    expect(screen.getByText('Guest Arrival')).toBeTruthy()
    expect(screen.getByText('Ceremony')).toBeTruthy()
    expect(screen.getByText('Cocktail Hour')).toBeTruthy()
    expect(screen.getByText('Reception')).toBeTruthy()

    expect(screen.queryByText('Vendor Access to Venue')).toBeNull()
    expect(screen.queryByText('Couple Access to Venue for Photography')).toBeNull()
    expect(screen.queryByText('Vendor Load Out')).toBeNull()
  })

  it('expands event details on click and collapses on second click', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'us',
      user: { role: 'bride' },
    })
    render(<EventDetails />)
    expect(screen.queryByText('Show Less')).toBeNull()

    fireEvent.click(screen.getAllByText('More Details')[0])
    expect(screen.getByText('Show Less')).toBeTruthy()

    fireEvent.click(screen.getByText('Show Less'))
    expect(screen.queryByText('Show Less')).toBeNull()
  })
})

describe('EventDetails India wedding', () => {
  it('renders India wedding when activeWedding is india', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'india',
      user: { role: 'bride' },
    })
    render(<EventDetails />)
    expect(screen.getByText('Thursday, February 25, 2027')).toBeTruthy()
    expect(screen.getByText('Dwaraka Palace')).toBeTruthy()
    expect(screen.getAllByText('Mehendi').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Muhurtham')).toBeTruthy()
    expect(screen.getByText('Wedding Reception')).toBeTruthy()
  })

  it('renders Wikipedia links for known foreign terms', () => {
    mockUseAuth.mockReturnValue({
      activeWedding: 'india',
      user: { role: 'bride' },
    })
    render(<EventDetails />)
    const mehendiLinks = screen.getAllByText('Mehendi')
    const anchor = mehendiLinks.find(el => el.tagName === 'A')
    expect(anchor).toBeTruthy()
    expect(anchor.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Mehndi')
  })
})
