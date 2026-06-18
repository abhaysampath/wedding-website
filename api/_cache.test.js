import { describe, it, expect, beforeEach } from 'vitest'
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  cacheInvalidatePrefix,
  _clearCacheForTesting,
  _cacheSize,
} from './_cache.js'

describe('cacheGet / cacheSet', () => {
  beforeEach(() => {
    _clearCacheForTesting()
  })

  it('returns null for missing key', () => {
    expect(cacheGet('missing')).toBeNull()
  })

  it('stores and retrieves a value', () => {
    cacheSet('key', { a: 1 }, 1000)
    expect(cacheGet('key')).toEqual({ a: 1 })
  })

  it('expires after TTL', () => {
    return new Promise(resolve => {
      cacheSet('key', 'value', 1)
      setTimeout(() => {
        expect(cacheGet('key')).toBeNull()
        resolve()
      }, 10)
    })
  })

  it('overwrites existing entries', () => {
    cacheSet('key', 'first', 1000)
    cacheSet('key', 'second', 1000)
    expect(cacheGet('key')).toBe('second')
  })
})

describe('cacheInvalidate', () => {
  beforeEach(() => {
    _clearCacheForTesting()
  })

  it('removes a single key', () => {
    cacheSet('a', 1, 1000)
    cacheSet('b', 2, 1000)
    cacheInvalidate('a')
    expect(cacheGet('a')).toBeNull()
    expect(cacheGet('b')).toBe(2)
  })

  it('is a no-op for missing keys', () => {
    cacheInvalidate('nonexistent')
    expect(_cacheSize()).toBe(0)
  })
})

describe('cacheInvalidatePrefix', () => {
  beforeEach(() => {
    _clearCacheForTesting()
  })

  it('removes all keys with the prefix', () => {
    cacheSet('content:sheet1', 'a', 1000)
    cacheSet('content:sheet2', 'b', 1000)
    cacheSet('other:key', 'c', 1000)
    cacheInvalidatePrefix('content:')
    expect(cacheGet('content:sheet1')).toBeNull()
    expect(cacheGet('content:sheet2')).toBeNull()
    expect(cacheGet('other:key')).toBe('c')
  })
})
