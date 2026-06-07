import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import config from '../config'

const INITIAL_LOAD = 10
const LOAD_MORE = 4
const FIRST_BATCH = 3
const PRELOAD_SIZE = 7
const TIER_SCALE = { 1: 1, 2: 0.82, 3: 0.66 }
const BASE_W = { mobile: 280, desktop: 320 }
const BASE_H = { mobile: 340, desktop: 380 }

const DIR_MAP = {
  home: `${config.images.baseUrl}/jpg/home/`,
  gallery: `${config.images.baseUrl}/jpg/gallery/`,
  vert: `${config.images.baseUrl}/jpg/vert/`,
}

function formatCaption(alt) {
  return alt
    .replace(/^[A-Z0-9-]+[_-]/, '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Untitled'
}

function Skeleton() {
  return (
    <div className="shrink-0 w-[260px] md:w-[300px] h-[320px] md:h-[360px] bg-sage-light/10 rounded-sm relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-cream/20 to-transparent" />
    </div>
  )
}

export default function Gallery() {
  const { user, setShowAuthModal } = useAuth()
  const ref = useRef(null)
  const sentinelRef = useRef(null)
  const [expanded, setExpanded] = useState(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD)
  const [loadedImages, setLoadedImages] = useState({})
  const sectionInView = useInView(ref, { once: true, margin: '-100px' })
  const [showOverlay, setShowOverlay] = useState(false)
  const overlayShown = useRef(false)
  const [eagerReady, setEagerReady] = useState(false)
  const preloaded = useRef(new Set())
  const lightboxRef = useRef(null)
  const touchStartX = useRef(null)
  const [zoomed, setZoomed] = useState(false)
  const lastTap = useRef(0)

  function preload(images) {
    (images || []).forEach(img => {
      if (!img?.jpg) return
      if (preloaded.current.has(img.jpg)) return
      preloaded.current.add(img.jpg)
      const pre = new Image()
      pre.src = img.jpg
    })
  }

  useEffect(() => {
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(() => setEagerReady(true), { timeout: 700 })
      : setTimeout(() => setEagerReady(true), 500)
    return () => {
      if (window.requestIdleCallback) window.cancelIdleCallback(id)
      else clearTimeout(id)
    }
  }, [])

  function seededShuffle(arr) {
    const a = [...arr]
    const seed = arr.reduce((acc, item) => {
      if (!item?.jpg) return acc
      let h = 0
      for (let i = 0; i < item.jpg.length; i++) {
        h = ((h << 5) - h + item.jpg.charCodeAt(i)) | 0
      }
      return (acc + h) | 0
    }, 0)
    let s = seed || 1
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 16807) % 2147483647
      const j = s % (i + 1);
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const allImages = useMemo(() => {
    const { gallery } = config.images
    const result = []
    for (const [section, images] of Object.entries(gallery)) {
      if (!images || !Array.isArray(images)) continue
      const dir = DIR_MAP[section] || '/jpg/'
      images.forEach(img => {
        if (!img || !img.file) return
        result.push({
          jpg: dir + img.file,
          alt: img.alt,
          tier: img.tier || 2,
        })
      })
    }
    return seededShuffle(result)
  }, [])

  useEffect(() => {
    if (!eagerReady) return
    preload(allImages.slice(0, FIRST_BATCH))
  }, [eagerReady, allImages])

  useEffect(() => {
    if (!sectionInView) return
    preload(allImages.slice(FIRST_BATCH, FIRST_BATCH + PRELOAD_SIZE))
  }, [sectionInView, allImages])

  const visibleImages = allImages.slice(0, visibleCount)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE, allImages.length))
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [allImages.length])

  useEffect(() => {
    if (user) return
    if (sectionInView && !overlayShown.current) {
      overlayShown.current = true
      const id = setTimeout(() => setShowOverlay(true), 3000)
      return () => clearTimeout(id)
    }
  }, [sectionInView, user])

  useEffect(() => {
    if (!user) return
    overlayShown.current = true
    const id = setTimeout(() => setShowOverlay(false), 0)
    return () => clearTimeout(id)
  }, [user])

  const handleImageLoad = useCallback((src) => {
    setLoadedImages((prev) => ({ ...prev, [src]: true }))
  }, [])

  const goNext = useCallback(() => {
    setExpanded((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
  }, [allImages.length])

  const goPrev = useCallback(() => {
    setExpanded((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
  }, [allImages.length])

  useEffect(() => {
    if (expanded === null) return
    const handler = (e) => {
      if (e.key === 'Escape') setExpanded(null)
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    const focusables = () => Array.from(lightboxRef.current?.querySelectorAll('button, [tabindex]:not([tabindex="-1"])') || [])
    const tabHandler = (e) => {
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) return
      const first = els[0], last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
    const handleTouchEnd = (e) => {
      if (touchStartX.current === null) return
      const dx = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null
      if (Math.abs(dx) > 50) { dx > 0 ? goPrev() : goNext() }
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('keydown', tabHandler)
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keydown', tabHandler)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [expanded, goNext, goPrev])

  return (
    <section id="gallery" className="py-24 md:py-32 pl-6 bg-cream relative" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-12 pr-6"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-3">
            Gallery
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto mb-4" />
          <p className="text-charcoal-light/60 text-sm max-w-md mx-auto">
            A glimpse into our journey together
          </p>
        </motion.div>

        <div
          className="overflow-x-auto pb-6 -mb-6 scrollbar-thin scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          <div className="flex gap-4 md:gap-6">
            {visibleImages.map((img, i) => {
              if (!img) return null
              const scale = TIER_SCALE[img.tier] || 0.66
              const wMob = `calc(${BASE_W.mobile}px * ${scale})`
              const hMob = `calc(${BASE_H.mobile}px * ${scale})`
              const opacity = 0.5 + scale * 0.5
              return (
              <motion.div
                key={img.jpg}
                layoutId={`gallery-${img.jpg}`}
                initial={{ opacity: 0, y: 20 }}
                animate={sectionInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.04 * i }}
                className="shrink-0 group cursor-pointer relative"
                style={{
                  scrollSnapAlign: 'start',
                  width: wMob,
                  height: hMob,
                  opacity,
                }}
                onClick={() => setExpanded(i)}
              >
                <div
                  className="relative overflow-hidden rounded-sm bg-sage-light/10"
                  style={{ width: '100%', height: '100%' }}
                >
                  {!loadedImages[img.jpg] && <Skeleton />}
                  <img
                    src={img.jpg}
                    alt={img.alt}
                    draggable={false}
                    className={`w-full h-full object-cover block transition-all duration-700 group-hover:scale-105 ${loadedImages[img.jpg] ? 'opacity-100' : 'opacity-0'}`}
                    loading={i < FIRST_BATCH && eagerReady ? 'eager' : 'lazy'}
                    onLoad={() => handleImageLoad(img.jpg)}
                    onError={() => handleImageLoad(img.jpg)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <p className="text-cream/90 text-xs font-light truncate">
                      {formatCaption(img.alt)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )})}

            <div ref={sentinelRef} className="shrink-0 w-4" />
          </div>
        </div>

        <AnimatePresence>
          {expanded !== null && allImages[expanded] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-charcoal/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
              onClick={() => setExpanded(null)}
            >
              <motion.div
                ref={lightboxRef}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setExpanded(null)}
                  className="absolute -top-12 right-0 text-cream/50 hover:text-cream text-[11px] tracking-[0.2em] uppercase transition-colors"
                >
                  Close <span className="text-cream/30 ml-1">(Esc)</span>
                </button>

                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      aria-label="Previous image"
                      className="absolute left-2 md:-left-14 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={goNext}
                      aria-label="Next image"
                      className="absolute right-2 md:-right-14 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}

                <motion.div
                  layoutId={`gallery-${allImages[expanded].jpg}`}
                  className="w-full"
                >
                  <img
                    src={allImages[expanded].jpg}
                    alt={allImages[expanded].alt}
                    className={`w-full h-auto rounded-sm select-none transition-transform duration-300 cursor-zoom-in ${
                      zoomed ? 'max-h-none scale-[2] origin-center' : 'max-h-[85vh] object-contain'
                    }`}
                    draggable={false}
                    onClick={() => {
                      const now = Date.now()
                      if (now - lastTap.current < 300) { setZoomed(z => !z); lastTap.current = 0 }
                      else lastTap.current = now
                    }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </motion.div>

                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-cream/40 text-[11px] tracking-wider">
                  {expanded + 1} / {allImages.length}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showOverlay && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-gradient-to-b from-transparent via-cream/80 to-cream backdrop-blur-[1px] flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setShowOverlay(false)}
              className="absolute top-6 right-6 w-[42px] h-[42px] flex items-center justify-center text-charcoal-light/40 hover:text-charcoal transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center px-6">
              <p className="text-charcoal-light/70 text-sm mb-4">
                Sign in to find your invite and view the full gallery
              </p>
              <button
                onClick={() => { setShowOverlay(false); setShowAuthModal(true) }}
                className="inline-flex items-center gap-3 bg-sage hover:bg-sage-dark text-cream text-xs tracking-widest uppercase px-6 py-3 rounded-sm transition-colors font-medium"
              >
                Find Your Invite
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
