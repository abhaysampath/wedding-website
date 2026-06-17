import { describe, it, expect } from 'vitest'
import weddingJSONLD from './wedding-jsonld.js'

describe('weddingJSONLD', () => {
  it('has the schema.org @context', () => {
    expect(weddingJSONLD['@context']).toBe('https://schema.org')
  })

  it('is an Event with valid status', () => {
    expect(weddingJSONLD['@type']).toBe('Event')
    expect(weddingJSONLD.eventStatus).toBe('https://schema.org/EventScheduled')
    expect(weddingJSONLD.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode')
  })

  it('uses a real, future wedding date (not 2025 or earlier)', () => {
    const start = new Date(weddingJSONLD.startDate)
    expect(start.getFullYear()).toBeGreaterThanOrEqual(2027)
    expect(start.toString()).not.toBe('Invalid Date')
  })

  it('does not contain placeholder text', () => {
    const json = JSON.stringify(weddingJSONLD)
    expect(json).not.toMatch(/123 Wedding Lane/)
    expect(json).not.toMatch(/example\.com/)
    expect(json).not.toMatch(/Wedding Venue/)
  })

  it('has a non-empty location name from weddings.json', () => {
    expect(weddingJSONLD.location.name).toBeTruthy()
    expect(weddingJSONLD.location.name.length).toBeGreaterThan(3)
  })

  it('has a subEvent for the India ceremony with a real address', () => {
    expect(weddingJSONLD.subEvent).toBeDefined()
    expect(weddingJSONLD.subEvent['@type']).toBe('Event')
    expect(weddingJSONLD.subEvent.location.address.addressCountry).toBe('IN')
  })

  it('has an organizer with a name and url', () => {
    expect(weddingJSONLD.organizer.name).toBeTruthy()
    expect(weddingJSONLD.organizer.url).toMatch(/^https:\/\//)
  })
})
