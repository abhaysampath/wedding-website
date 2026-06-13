import { describe, it, expect } from 'vitest'
import { linkTerms } from './glossary'

describe('linkTerms', () => {
  it('returns falsy input as-is', () => {
    expect(linkTerms(null)).toBeNull()
    expect(linkTerms('')).toBe('')
    expect(linkTerms(undefined)).toBeUndefined()
  })

  it('returns plain text array when no terms match', () => {
    expect(linkTerms('Hello world')).toEqual(['Hello world'])
  })

  it('links a single known term', () => {
    expect(linkTerms('Muhurtham')).toEqual([
      { word: 'Muhurtham', url: 'https://en.wikipedia.org/wiki/Muhurta' },
    ])
  })

  it('links multiple terms separated by plain text', () => {
    expect(linkTerms('Mehendi and Saree')).toEqual([
      { word: 'Mehendi', url: 'https://en.wikipedia.org/wiki/Mehndi' },
      ' and ',
      { word: 'Saree', url: 'https://en.wikipedia.org/wiki/Sari' },
    ])
  })

  it('is case-insensitive', () => {
    expect(linkTerms('MEHENDI')).toEqual([
      { word: 'MEHENDI', url: 'https://en.wikipedia.org/wiki/Mehndi' },
    ])
    expect(linkTerms('mehendi')).toEqual([
      { word: 'mehendi', url: 'https://en.wikipedia.org/wiki/Mehndi' },
    ])
  })

  it('matches word boundaries only', () => {
    expect(linkTerms('Sarees are nice')).toEqual([
      { word: 'Sarees', url: 'https://en.wikipedia.org/wiki/Sari' },
      ' are nice',
    ])
  })

  it('does not match partial words', () => {
    expect(linkTerms('SareeStore')).toEqual(['SareeStore'])
    expect(linkTerms('LehengasOnline')).toEqual(['LehengasOnline'])
  })

  it('handles term at start and end of string', () => {
    const result = linkTerms('Kurta and Sherwani')
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      word: 'Kurta',
      url: 'https://en.wikipedia.org/wiki/Kurta',
    })
    expect(result[1]).toBe(' and ')
    expect(result[2]).toEqual({
      word: 'Sherwani',
      url: 'https://en.wikipedia.org/wiki/Sherwani',
    })
  })

  it('handles multiple occurrences of the same term', () => {
    expect(linkTerms('Saree and Saree')).toEqual([
      { word: 'Saree', url: 'https://en.wikipedia.org/wiki/Sari' },
      ' and ',
      { word: 'Saree', url: 'https://en.wikipedia.org/wiki/Sari' },
    ])
  })

  it('preserves case of matched word in output', () => {
    expect(linkTerms('sHERWANI')).toEqual([
      { word: 'sHERWANI', url: 'https://en.wikipedia.org/wiki/Sherwani' },
    ])
  })
})
