import { useState, useEffect, useRef } from 'react'

export function useScrollSpy(ids, rootMargin, threshold = [0, 0.25, 0.5]) {
  const [active, setActive] = useState('')
  const idsKey = ids.join('|')
  const thresholdKey = threshold.join('|')

  useEffect(() => {
    if (!ids.length) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin, threshold },
    )

    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [idsKey, rootMargin, thresholdKey, ids, threshold])

  return active
}

export function useSectionHash(ids, rootMargin = '-80px 0px -50% 0px', threshold = [0, 0.25, 0.5]) {
  const [lastId, setLastId] = useState('')
  const lastIdRef = useRef(lastId)
  const idsKey = ids.join('|')
  const thresholdKey = threshold.join('|')

  useEffect(() => {
    if (!ids.length) return

    const updateHash = id => {
      if (id === lastIdRef.current) return
      setLastId(id)
      const hash = id === 'hero' ? '' : `#${id}`
      const url = hash
        ? `${window.location.pathname.replace(/\/$/, '')}${hash}`
        : window.location.pathname.replace(/\/$/, '') || '/'
      history.replaceState(null, '', url)
    }

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) updateHash(visible[0].target.id)
      },
      { rootMargin, threshold },
    )

    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    const onPopState = () => {
      const hash = window.location.hash.slice(1)
      if (hash && ids.includes(hash)) {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'instant' })
      } else if (!hash) {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', onPopState)
    }
  }, [idsKey, rootMargin, thresholdKey, ids, threshold])

  useEffect(() => {
    lastIdRef.current = lastId
  }, [lastId])

  return lastId
}
