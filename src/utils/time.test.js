import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eastTime } from './time'

describe('eastTime', () => {
  it('returns a string in the expected format', () => {
    const result = eastTime()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} ET$/)
  })

  it('contains ET timezone suffix', () => {
    expect(eastTime()).toContain(' ET')
  })

  it('returns valid date components', () => {
    const result = eastTime()
    const [datePart] = result.split(' ')
    const [year, month, day] = datePart.split('-')
    expect(Number(year)).toBeGreaterThan(2020)
    expect(Number(month)).toBeGreaterThanOrEqual(1)
    expect(Number(month)).toBeLessThanOrEqual(12)
    expect(Number(day)).toBeGreaterThanOrEqual(1)
    expect(Number(day)).toBeLessThanOrEqual(31)
  })
})
