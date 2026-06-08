import { describe, it, expect } from 'vitest'
import { maskEmail, maskPhone } from './mask'

describe('maskEmail', () => {
  it('returns empty string for empty input', () => {
    expect(maskEmail('')).toBe('')
    expect(maskEmail(null)).toBe('')
    expect(maskEmail(undefined)).toBe('')
  })

  it('returns single-char local part as-is', () => {
    expect(maskEmail('a@b.c')).toBe('a@b.c')
  })

  it('masks short local part (2-4 chars) with first+last+stars', () => {
    expect(maskEmail('ab@c.d')).toBe('a***b@c.d')
    expect(maskEmail('abc@x.com')).toBe('a***c@x.com')
    expect(maskEmail('abcd@x.com')).toBe('a***d@x.com')
  })

  it('masks longer local part (5+ chars) with first3+stars+last1', () => {
    expect(maskEmail('test@example.com')).toBe('t***t@example.com')
    expect(maskEmail('jane@example.com')).toBe('j***e@example.com')
    expect(maskEmail('hello@example.com')).toBe('hel***o@example.com')
  })

  it('masks local part with first3+stars+last1 for long emails', () => {
    expect(maskEmail('hello.world@domain.co')).toBe('hel***d@domain.co')
  })
})

describe('maskPhone', () => {
  it('returns empty string for empty input', () => {
    expect(maskPhone('')).toBe('')
    expect(maskPhone(null)).toBe('')
    expect(maskPhone(undefined)).toBe('')
  })

  it('returns empty string when fewer than 4 digits', () => {
    expect(maskPhone('123')).toBe('')
    expect(maskPhone('abc')).toBe('')
  })

  it('masks all but last 4 digits', () => {
    expect(maskPhone('5551234567')).toBe('******4567')
  })

  it('strips non-digits before masking', () => {
    expect(maskPhone('(555) 123-4567')).toBe('******4567')
    expect(maskPhone('+15551234567')).toBe('*******4567')
  })

  it('handles exactly 4 digits (no masking)', () => {
    expect(maskPhone('1234')).toBe('1234')
    expect(maskPhone('+1 (234)')).toBe('1234')
  })
})
