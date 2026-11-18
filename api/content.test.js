import { describe, it, expect } from 'vitest'
import { parseWeddings } from './content.js'

describe('parseWeddings', () => {
  it('returns both weddings for "Both"', () => {
    expect(parseWeddings('Both')).toEqual(['us', 'india'])
    expect(parseWeddings('both')).toEqual(['us', 'india'])
  })

  it('returns both weddings for explicit combos like "US, India"', () => {
    expect(parseWeddings('US, India')).toEqual(['us', 'india'])
    expect(parseWeddings('India, US')).toEqual(['us', 'india'])
    expect(parseWeddings('US & India')).toEqual(['us', 'india'])
    expect(parseWeddings('India and US')).toEqual(['us', 'india'])
  })

  it('returns US only for US-only values', () => {
    expect(parseWeddings('US')).toEqual(['us'])
    expect(parseWeddings('us')).toEqual(['us'])
  })

  it('returns India only for India-only values', () => {
    expect(parseWeddings('India')).toEqual(['india'])
    expect(parseWeddings('india')).toEqual(['india'])
  })

  it('defaults to US for blank values', () => {
    expect(parseWeddings('')).toEqual(['us'])
    expect(parseWeddings(null)).toEqual(['us'])
    expect(parseWeddings(undefined)).toEqual(['us'])
  })
})
