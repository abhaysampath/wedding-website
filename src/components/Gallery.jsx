import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import config, { imgUrl, imgSrcSet } from '../config'

const INITIAL_LOAD = 10
const LOAD_MORE = 4
const FIRST_BATCH = 3
const TIER_SCALE = { 1: 1, 2: 0.82, 3: 0.66 }
const BASE_W = { mobile: 280, desktop: 320 }
const BASE_H = { mobile: 340, desktop: 380 }

function shuffle(arr) {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function buildSectionImages(sectionKey) {
  const images = config.images.gallery[sectionKey]
  if (!images || !Array.isArray(images)) return []
  return images
    .filter(img => img?.path)
    .map(img => ({
      jpg: imgUrl(img.path),
      srcset: imgSrcSet(img.path),
      alt: img.alt,
      tier: img.tier || 2,
    }))
}

function buildAllImages() {
  const result = []
  for (const key of Object.keys(config.images.gallery)) {
    result.push(...buildSectionImages(key))
  }
  return shuffle(result)
}

const ALL_HOME_IMAGES = shuffle(buildSectionImages('home'))
const ALL_FULL_IMAGES = shuffle(buildAllImages())

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
  const isAuthenticated = !!user
  const images = useMemo(
    () => (isAuthenticated ? ALL_FULL_IMAGES : ALL_HOME_IMAGES),
    [isAuthenticated],
  )
  const [loadedImages, setLoadedImages] = useState({})
  const sectionInView = useInView(ref, { once: true, margin: '-100px' })
  const [showOverlay, setShowOverlay] = useState(false)
  const overlayShown = useRef(false)
  const [eagerReady, setEagerReady] = useState(false)
  const preloaded = useRef(new Set())
  const lightboxRef = useRef(null)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const [zoomed, setZoomed] = useState(false)
  const lastTap = useRef(0)
  const prevFocusRef = useRef(null)

  useEffect(() => {
    if (expanded !== null) {
      prevFocusRef.current = document.activeElement
    } else if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
      prevFocusRef.current.focus()
      prevFocusRef.current = null
    }
  }, [expanded])

  function preload(images) {
    ;(images || []).forEach(img => {
      if (!img?.jpg) return
      if (!preloaded.current || preloaded.current.has(img.jpg)) return
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

  useEffect(() => {
    if (!eagerReady) return
    preload(images.slice(0, FIRST_BATCH))
  }, [eagerReady, images])

  useEffect(() => {
    if (!sectionInView) return
    preload(images.slice(FIRST_BATCH))
  }, [sectionInView, images])

  const visibleImages = images.slice(0, visibleCount)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + LOAD_MORE, images.length))
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [images.length])

  useEffect(() => {
    if (user) return
    if (sectionInView && !overlayShown.current) {
      overlayShown.current = true
      // Wait until the first batch of images has loaded, then give the
      // guest a few more seconds to look at the photos before showing
      // the sign-in overlay. The first batch is images 0..FIRST_BATCH-1.
      const firstBatch = images.slice(0, FIRST_BATCH)
      let delay = 5500
      const loadedCount = Object.values(loadedImages).filter(Boolean).length
      if (loadedCount < firstBatch.length) {
        delay = Math.max(delay, 5500 + (firstBatch.length - loadedCount) * 800)
      }
      const id = setTimeout(() => setShowOverlay(true), delay)
      return () => clearTimeout(id)
    }
  }, [sectionInView, user, loadedImages, images])

  useEffect(() => {
    if (!user) return
    overlayShown.current = true
    const id = setTimeout(() => setShowOverlay(false), 0)
    return () => clearTimeout(id)
  }, [user])

  const handleImageLoad = useCallback(src => {
    setLoadedImages(prev => ({ ...prev, [src]: true }))
  }, [])

  useEffect(() => {
    if (expanded >= images.length) {
      const id = setTimeout(() => setExpanded(images.length > 0 ? 0 : null), 0)
      return () => clearTimeout(id)
    }
  }, [expanded, images.length])

  const goNext = useCallback(() => {
    setExpanded(prev => {
      const next = prev < images.length - 1 ? prev + 1 : 0
      preload([
        images[next],
        images[(next + 1) % images.length],
        images[(next - 1 + images.length) % images.length],
      ])
      return next
    })
  }, [images])

  const goPrev = useCallback(() => {
    setExpanded(prev => {
      const next = prev > 0 ? prev - 1 : images.length - 1
      preload([
        images[next],
        images[(next + 1) % images.length],
        images[(next - 1 + images.length) % images.length],
      ])
      return next
    })
  }, [images])

  useEffect(() => {
    if (expanded === null) return
    const handler = e => {
      if (e.key === 'Escape') setExpanded(null)
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    const focusables = () =>
      Array.from(
        lightboxRef.current?.querySelectorAll('button, [tabindex]:not([tabindex="-1"])') || [],
      )
    const tabHandler = e => {
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) return
      const first = els[0],
        last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    const handleTouchStart = e => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }
    const handleTouchMove = e => {
      if (touchStartX.current === null) return
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 8) {
        e.preventDefault()
      }
    }
    const handleTouchEnd = e => {
      if (touchStartX.current === null) return
      const dx = e.changedTouches[0].clientX - touchStartX.current
      const dy = e.changedTouches[0].clientY - touchStartY.current
      touchStartX.current = null
      touchStartY.current = null
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 30) {
        dx > 0 ? goPrev() : goNext()
      }
    }
    const lightbox = lightboxRef.current
    window.addEventListener('keydown', handler)
    window.addEventListener('keydown', tabHandler)
    if (lightbox) {
      lightbox.addEventListener('touchstart', handleTouchStart, { passive: true })
      lightbox.addEventListener('touchmove', handleTouchMove, { passive: false })
      lightbox.addEventListener('touchend', handleTouchEnd, { passive: true })
    }
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keydown', tabHandler)
      if (lightbox) {
        lightbox.removeEventListener('touchstart', handleTouchStart)
        lightbox.removeEventListener('touchmove', handleTouchMove)
        lightbox.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [expanded, goNext, goPrev])

  return (
    <section id="gallery" className="py-24 md:py-32 pl-6 bg-sage-fog relative" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={sectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-12 pr-6"
        >
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-charcoal font-light pt-1 mb-3 whitespace-nowrap">
            Gallery
          </h2>
          <div className="w-12 h-[1px] bg-sage mx-auto mb-4" />
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
              if (!img?.jpg) return null
              const scale = TIER_SCALE[img.tier] || 0.66
              const wMob = `calc(${BASE_W.mobile}px * ${scale})`
              const hMob = `calc(${BASE_H.mobile}px * ${scale})`
              const opacity = 0.5 + scale * 0.5
              return (
                <motion.button
                  type="button"
                  key={img.jpg}
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
                  aria-label={`Open ${img.alt}`}
                >
                  <div
                    className="relative overflow-hidden rounded-sm bg-sage-light/10"
                    style={{ width: '100%', height: '100%' }}
                  >
                    {!loadedImages[img.jpg] && <Skeleton />}
                    <img
                      src={img.jpg}
                      srcSet={img.srcset}
                      sizes="(max-width: 640px) 280px, (max-width: 1024px) 300px, 320px"
                      alt={img.alt}
                      draggable={false}
                      className={`w-full h-full object-cover block transition-all duration-700 group-hover:scale-105 ${loadedImages[img.jpg] ? 'opacity-100' : 'opacity-0'}`}
                      loading={i < FIRST_BATCH && eagerReady ? 'eager' : 'lazy'}
                      fetchPriority={i < FIRST_BATCH && eagerReady ? 'high' : 'low'}
                      onLoad={() => handleImageLoad(img.jpg)}
                      onError={e => {
                        e.target.style.display = 'none'
                        handleImageLoad(img.jpg)
                        console.warn('Gallery image failed to load:', img.jpg)
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </motion.button>
              )
            })}

            <div ref={sentinelRef} className="shrink-0 w-4" />
          </div>
        </div>

        <AnimatePresence>
          {showOverlay && !user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-charcoal/50 backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center px-6"
              >
                <p className="text-cream/70 text-sm tracking-wide mb-4">
                  Sign in to see our galleries
                </p>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="bg-sage hover:bg-sage-dark text-cream text-sm tracking-widest uppercase px-6 py-3 rounded-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {expanded !== null && images[expanded] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-charcoal/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
              onClick={() => setExpanded(null)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setExpanded(null)
                }
              }}
              role="dialog"
              aria-modal="true"
              aria-label={`Image ${expanded + 1} of ${images.length}: ${images[expanded]?.alt || 'Untitled'}`}
            >
              <motion.div
                ref={lightboxRef}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center"
                onClick={e => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(null)}
                  aria-label="Close image viewer"
                  className="absolute -top-12 right-0 min-h-[44px] min-w-[44px] px-3 py-2 text-cream/70 hover:text-cream text-[11px] tracking-[0.2em] uppercase transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cream/60 rounded-sm"
                >
                  Close <span className="text-cream/30 ml-1">(Esc)</span>
                </button>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        goPrev()
                      }}
                      aria-label="Previous image"
                      className="absolute left-2 md:-left-14 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
                    >
                      <svg
                        className="w-4 h-4 md:w-5 md:h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        goNext()
                      }}
                      aria-label="Next image"
                      className="absolute right-2 md:-right-14 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
                    >
                      <svg
                        className="w-4 h-4 md:w-5 md:h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}

                <motion.div className="w-full">
                  <img
                    src={images[expanded].jpg}
                    srcSet={images[expanded].srcset}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1920px"
                    alt={images[expanded].alt}
                    className={`w-full h-auto rounded-sm select-none transition-transform duration-300 cursor-zoom-in ${
                      zoomed ? 'max-h-none scale-[2] origin-center' : 'max-h-[85vh] object-contain'
                    }`}
                    draggable={false}
                    fetchPriority="high"
                    onClick={() => {
                      const now = Date.now()
                      if (now - lastTap.current < 300) {
                        setZoomed(z => !z)
                        lastTap.current = 0
                      } else lastTap.current = now
                    }}
                    onError={e => {
                      e.target.style.display = 'none'
                    }}
                  />
                </motion.div>

                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-cream/40 text-[11px] tracking-wider">
                  {expanded + 1} / {images.length}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
