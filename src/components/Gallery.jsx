import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useAuth } from '../context/useAuth'

const INITIAL_LOAD = 8
const LOAD_MORE = 4

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
  const { content, user, setShowAuthModal } = useAuth()
  const ref = useRef(null)
  const sentinelRef = useRef(null)
  const [expanded, setExpanded] = useState(null)
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD)
  const [loadedImages, setLoadedImages] = useState({})
  const sectionInView = useInView(ref, { once: true, margin: '-100px' })
  const [showOverlay, setShowOverlay] = useState(false)
  const overlayShown = useRef(false)
  const scrollRef = useRef(null)

  const images = content.images || []

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE, images.length))
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [images.length])

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
    setExpanded((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  const goPrev = useCallback(() => {
    setExpanded((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  useEffect(() => {
    if (expanded === null) return
    const handler = (e) => {
      if (e.key === 'Escape') setExpanded(null)
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expanded, goNext, goPrev])

  const visibleImages = images.slice(0, visibleCount)

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
          ref={scrollRef}
          className="overflow-x-auto pb-6 -mb-6 scrollbar-thin scroll-smooth"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          <div className="flex gap-4 md:gap-6">
            {visibleImages.map((img, i) => (
              <motion.div
                key={img.jpg}
                initial={{ opacity: 0, y: 20 }}
                animate={sectionInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.04 * i }}
                className="shrink-0 w-[260px] md:w-[300px] group cursor-pointer relative"
                style={{ scrollSnapAlign: 'start' }}
                onClick={() => setExpanded(i)}
              >
                <div className="relative overflow-hidden rounded-sm bg-sage-light/10 h-[320px] md:h-[360px]">
                  {!loadedImages[img.jpg] && <Skeleton />}
                  <img
                    src={img.jpg}
                    alt={img.alt}
                    draggable={false}
                    className={`w-full h-full object-cover block transition-all duration-700 group-hover:scale-105 ${loadedImages[img.jpg] ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => handleImageLoad(img.jpg)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <p className="text-cream/90 text-xs font-light truncate">
                      {formatCaption(img.alt)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            <div ref={sentinelRef} className="shrink-0 w-4" />
          </div>
        </div>

        <AnimatePresence>
          {expanded !== null && images[expanded] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-charcoal/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
              onClick={() => setExpanded(null)}
            >
              <motion.div
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

                {images.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-2 md:-left-14 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-2 md:-right-14 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
                    >
                      <svg className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}

                <img
                  src={images[expanded].jpg}
                  alt={images[expanded].alt}
                  className="w-full h-auto max-h-[85vh] object-contain rounded-sm select-none"
                  draggable={false}
                />

                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-cream/40 text-[11px] tracking-wider">
                  {expanded + 1} / {images.length}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign-in overlay for unauthenticated users */}
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
