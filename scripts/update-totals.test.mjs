import { describe, it, expect } from 'vitest'
import { computeTotals, buildTotalsUpdate, parseSheet } from './update-totals.mjs'

describe('parseSheet', () => {
  it('returns empty array for empty values', () => {
    expect(parseSheet(null, {})).toEqual([])
    expect(parseSheet([], {})).toEqual([])
    expect(parseSheet([['A']], {})).toEqual([])
  })

  it('parses rows by header name (case-insensitive)', () => {
    const values = [
      ['First Name', 'Last Name', 'Email Address', 'US-RSVP', 'India-RSVP', 'Title'],
      ['Akshay', 'Sampath', 'a@b.com', 'Yes', 'No', ''],
    ]
    const config = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email Address',
      rsvpUs: 'US-RSVP',
      rsvpIndia: 'India-RSVP',
      title: 'Title',
    }
    const rows = parseSheet(values, config)
    expect(rows).toEqual([
      {
        firstName: 'Akshay',
        lastName: 'Sampath',
        email: 'a@b.com',
        rsvpUs: 'Yes',
        rsvpIndia: 'No',
        title: '',
      },
    ])
  })

  it('blanks comment cells (starting with #)', () => {
    const values = [
      ['First Name', 'Title'],
      ['#disabled', '#note'],
    ]
    const config = { firstName: 'First Name', title: 'Title' }
    const rows = parseSheet(values, config)
    expect(rows[0]).toEqual({ firstName: '', title: '' })
  })
})

function makeRow(overrides) {
  return {
    firstName: '',
    lastName: '',
    title: '',
    invitedTo: '',
    rsvpUs: '',
    rsvpIndia: '',
    plusOne: 'N/A',
    email: '',
    phone: '',
    address: '',
    dietaryPreferences: '',
    lastLogin: '',
    loginFailed: '',
    ...overrides,
  }
}

describe('computeTotals', () => {
  it('excludes TEST and KIDS rows from total', () => {
    const rows = [
      makeRow({ firstName: 'A' }),
      makeRow({ firstName: 'B', title: 'KIDS' }),
      makeRow({ firstName: 'C', title: 'TEST' }),
    ]
    const totals = computeTotals(rows)
    expect(totals.total).toBe(1)
    expect(totals.kidsRows).toBe(1)
    expect(totals.testRows).toBe(1)
  })

  it('normalizes YES/NO to Yes/No', () => {
    const rows = [
      makeRow({ rsvpUs: 'YES', rsvpIndia: 'NO' }),
      makeRow({ rsvpUs: 'yes', rsvpIndia: 'no' }),
      makeRow({ rsvpUs: 'Yes', rsvpIndia: 'No' }),
    ]
    const totals = computeTotals(rows)
    expect(totals.rsvpUsYes).toBe(3)
    expect(totals.rsvpUsNo).toBe(0)
    expect(totals.rsvpIndiaYes).toBe(0)
    expect(totals.rsvpIndiaNo).toBe(3)
  })

  it('counts pending as total minus yes minus no', () => {
    const rows = [
      makeRow({ rsvpUs: 'Yes' }),
      makeRow({ rsvpUs: 'No' }),
      makeRow({ rsvpUs: '' }),
      makeRow({ rsvpUs: 'garbage' }),
    ]
    const totals = computeTotals(rows)
    expect(totals.rsvpUsYes).toBe(1)
    expect(totals.rsvpUsNo).toBe(1)
    expect(totals.rsvpUsPending).toBe(2)
  })

  it('parses invitedTo "Both" / "US" / "India" correctly', () => {
    const rows = [
      makeRow({ invitedTo: 'Both' }),
      makeRow({ invitedTo: 'US' }),
      makeRow({ invitedTo: 'India' }),
      makeRow({ invitedTo: 'us' }),
      makeRow({ invitedTo: 'both' }),
    ]
    const totals = computeTotals(rows)
    expect(totals.invBoth).toBe(2)
    expect(totals.invUsOnly).toBe(2)
    expect(totals.invIndiaOnly).toBe(1)
  })

  it('counts attending any / declining all / pending', () => {
    const rows = [
      makeRow({ invitedTo: 'Both', rsvpUs: 'Yes', rsvpIndia: 'Yes' }),
      makeRow({ invitedTo: 'Both', rsvpUs: 'No', rsvpIndia: 'No' }),
      makeRow({ invitedTo: 'US', rsvpUs: 'Yes', rsvpIndia: '' }),
      makeRow({ invitedTo: 'India', rsvpUs: '', rsvpIndia: 'No' }),
      makeRow({ invitedTo: 'US', rsvpUs: '', rsvpIndia: '' }),
    ]
    const totals = computeTotals(rows)
    expect(totals.attendingBoth).toBe(1)
    expect(totals.attendingUsOnly).toBe(1)
    expect(totals.attendingIndiaOnly).toBe(0)
    expect(totals.attendingAny).toBe(2)
    expect(totals.decliningAny).toBe(2)
    expect(totals.pendingResponse).toBe(1)
  })

  it('counts plus-one allowances', () => {
    const rows = [
      makeRow({ plusOne: 'Allowed+1' }),
      makeRow({ plusOne: 'Is+1' }),
      makeRow({ plusOne: '+1NOTALLOWED' }),
      makeRow({ plusOne: 'N/A' }),
      makeRow({ plusOne: '' }),
    ]
    const totals = computeTotals(rows)
    expect(totals.allowedPlusOne).toBe(1)
    expect(totals.isPlusOne).toBe(1)
    expect(totals.notAllowedPlusOne).toBe(1)
    expect(totals.naPlusOne).toBe(2)
  })

  it('counts contact info completeness', () => {
    const rows = [
      makeRow({ email: 'a@b.com', phone: '5551234567', address: '123 Main' }),
      makeRow({ email: '', phone: '', address: '' }),
      makeRow({ email: 'c@d.com' }),
    ]
    const totals = computeTotals(rows)
    expect(totals.withEmail).toBe(2)
    expect(totals.withPhone).toBe(1)
    expect(totals.withAddress).toBe(1)
  })

  it('counts dietary tracking for attending guests only', () => {
    const rows = [
      makeRow({ rsvpUs: 'Yes', dietaryPreferences: 'Vegetarian' }),
      makeRow({ rsvpUs: 'Yes', dietaryPreferences: '' }),
      makeRow({ rsvpUs: 'No', dietaryPreferences: 'Should not count' }),
    ]
    const totals = computeTotals(rows)
    expect(totals.dietaryUs).toBe(1)
  })

  it('returns zeros for empty input', () => {
    const totals = computeTotals([])
    expect(totals.total).toBe(0)
    expect(totals.rsvpUsYes).toBe(0)
    expect(totals.attendingAny).toBe(0)
  })
})

describe('buildTotalsUpdate', () => {
  it('produces a row per metric label with a value', () => {
    const totals = computeTotals([
      makeRow({ firstName: 'A', rsvpUs: 'Yes', invitedTo: 'US' }),
    ])
    const rows = buildTotalsUpdate(totals)
    expect(rows.length).toBeGreaterThan(20)
    expect(rows[0][0]).toBe('Last updated')
    expect(rows[0][1]).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('starts with a Last updated row', () => {
    const rows = buildTotalsUpdate(computeTotals([]))
    expect(rows[0][0]).toBe('Last updated')
  })
})
