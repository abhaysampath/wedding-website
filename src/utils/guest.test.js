import { describe, it, expect } from 'vitest'
import { stripPhone, guestLabel, roleLabels, fullName } from './guest'

describe('stripPhone', () => {
  it('removes non-digit characters', () => {
    expect(stripPhone('(555) 123-4567')).toBe('5551234567')
  })

  it('handles +1 prefix', () => {
    expect(stripPhone('+15551234567')).toBe('15551234567')
  })

  it('returns empty string for empty input', () => {
    expect(stripPhone('')).toBe('')
    expect(stripPhone(null)).toBe('')
    expect(stripPhone(undefined)).toBe('')
  })

  it('passes through already clean digits', () => {
    expect(stripPhone('5551234567')).toBe('5551234567')
  })
})

describe('fullName', () => {
  it('returns empty string for null/undefined', () => {
    expect(fullName(null)).toBe('')
    expect(fullName(undefined)).toBe('')
  })

  it('returns firstName + lastName without prefix', () => {
    expect(fullName({ firstName: 'Jane', lastName: 'Doe' })).toBe('Jane Doe')
  })

  it('prepends prefix when present', () => {
    expect(fullName({ firstName: 'John', lastName: 'Smith', title: 'Dr.' })).toBe('Dr. John Smith')
  })

  it('trims title whitespace', () => {
    expect(fullName({ firstName: 'Jane', lastName: 'Doe', title: '  Dr.  ' })).toBe('Dr. Jane Doe')
  })
})

describe('guestLabel', () => {
  const sideName = { bride: 'Rebecca', groom: 'Abhay' }

  it('returns empty string for null/undefined guest', () => {
    expect(guestLabel(null, sideName)).toBe('')
    expect(guestLabel(undefined, sideName)).toBe('')
  })

  it('returns "The Bride" for bride role', () => {
    expect(guestLabel({ role: 'bride' }, sideName)).toBe('The Bride')
  })

  it('returns "The Groom" for groom role', () => {
    expect(guestLabel({ role: 'groom' }, sideName)).toBe('The Groom')
  })

  it('returns relationship if present', () => {
    const guest = { role: 'invited_guest', relationship: 'Cousin', side: 'bride' }
    expect(guestLabel(guest, sideName)).toBe('Cousin')
  })

  it('formats side + role fallback', () => {
    const guest = { role: 'close_family', side: 'bride' }
    expect(guestLabel(guest, sideName)).toBe("Rebecca's close family")
  })
})

describe('roleLabels', () => {
  it('has all expected role keys', () => {
    expect(roleLabels).toHaveProperty('bride')
    expect(roleLabels).toHaveProperty('groom')
    expect(roleLabels).toHaveProperty('close_family')
    expect(roleLabels).toHaveProperty('invited_guest')
    expect(roleLabels).toHaveProperty('vendor')
  })

  it('has correct label values', () => {
    expect(roleLabels.bride).toBe('Bride')
    expect(roleLabels.groom).toBe('Groom')
    expect(roleLabels.close_family).toBe('Close Family')
    expect(roleLabels.invited_guest).toBe('Invited Guest')
    expect(roleLabels.vendor).toBe('Vendor')
  })
})
