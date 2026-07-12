import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('useScrollSpy', () => {
  let observeMock
  let disconnectMock
  let entriesCallback

  beforeEach(() => {
    observeMock = vi.fn()
    disconnectMock = vi.fn()
    entriesCallback = null

    globalThis.IntersectionObserver = vi.fn(function (callback) {
      entriesCallback = callback
      this.observe = observeMock
      this.disconnect = disconnectMock
      this.unobserve = vi.fn()
    })

    document.body.innerHTML = `
      <section id="hero">Hero</section>
      <section id="story">Story</section>
      <section id="contact">Contact</section>
    `
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns empty string when no ids given', async () => {
    const { useScrollSpy } = await import('./useScrollSpy')
    const { result } = renderHook(() => useScrollSpy([], '-80px 0px -60% 0px'))
    expect(result.current).toBe('')
  })

  it('observes all given element ids', async () => {
    const { useScrollSpy } = await import('./useScrollSpy')
    renderHook(() => useScrollSpy(['hero', 'story'], '-80px 0px -60% 0px'))
    expect(observeMock).toHaveBeenCalledTimes(2)
  })

  it('sets active id when element becomes visible', async () => {
    const { useScrollSpy } = await import('./useScrollSpy')
    const { result } = renderHook(() => useScrollSpy(['hero', 'story'], '-80px 0px -60% 0px'))

    act(() => {
      entriesCallback([
        { target: document.getElementById('story'), isIntersecting: true, intersectionRatio: 0.5 },
      ])
    })

    expect(result.current).toBe('story')
  })

  it('disconnects observer on unmount', async () => {
    const { useScrollSpy } = await import('./useScrollSpy')
    const { unmount } = renderHook(() => useScrollSpy(['hero'], '-80px 0px -60% 0px'))
    unmount()
    expect(disconnectMock).toHaveBeenCalled()
  })

  it('prefers higher intersection ratio when multiple visible', async () => {
    const { useScrollSpy } = await import('./useScrollSpy')
    const { result } = renderHook(() => useScrollSpy(['hero', 'story'], '-80px 0px -60% 0px'))

    act(() => {
      entriesCallback([
        { target: document.getElementById('hero'), isIntersecting: true, intersectionRatio: 0.3 },
        { target: document.getElementById('story'), isIntersecting: true, intersectionRatio: 0.7 },
      ])
    })

    expect(result.current).toBe('story')
  })
})

describe('useSectionHash', () => {
  let replaceStateSpy
  let entriesCallback

  beforeEach(() => {
    vi.useFakeTimers()
    entriesCallback = null
    replaceStateSpy = vi.spyOn(window.history, 'replaceState')

    globalThis.IntersectionObserver = vi.fn(function (callback) {
      entriesCallback = callback
      this.observe = vi.fn()
      this.disconnect = vi.fn()
      this.unobserve = vi.fn()
    })

    document.body.innerHTML = `
      <section id="hero">Hero</section>
      <section id="story">Story</section>
    `
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not call replaceState when no ids given', async () => {
    const { useSectionHash } = await import('./useScrollSpy')
    renderHook(() => useSectionHash([], '-80px 0px -50% 0px'))
    expect(replaceStateSpy).not.toHaveBeenCalled()
  })

  it('updates URL hash when section becomes visible', async () => {
    const { useSectionHash } = await import('./useScrollSpy')
    renderHook(() => useSectionHash(['hero', 'story'], '-80px 0px -50% 0px'))

    act(() => {
      entriesCallback([
        { target: document.getElementById('story'), isIntersecting: true, intersectionRatio: 0.5 },
      ])
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', expect.stringContaining('#story'))
  })

  it('clears hash when hero is visible', async () => {
    const { useSectionHash } = await import('./useScrollSpy')
    renderHook(() => useSectionHash(['hero', 'story'], '-80px 0px -50% 0px'))

    act(() => {
      entriesCallback([
        { target: document.getElementById('hero'), isIntersecting: true, intersectionRatio: 0.5 },
      ])
    })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/')
  })
})
