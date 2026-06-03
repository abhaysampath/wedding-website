import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useAuth } from '../context/useAuth'

const INITIAL_LOAD = 8
const LOAD_MORE = 4

function Skeleton() {
  return (
    <div className="shrink-0 w-[260px] md:w-[300px] h-[320px] md:h-[360px] bg-sage-light/20 rounded-sm animate-pulse" />
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
  const needsMore = useInView(sentinelRef, { margin: '200px' })
  const [showOverlay, setShowOverlay] = useState(false)
  const focusTimerRef = useRef(null)
  const returnTimerRef = useRef(null)

  const images = content.images || []

  useEffect(() => {
    if (needsMore && visibleCount < images.length) {
      setVisibleCount((prev) => Math.min(prev + LOAD_MORE, images.length))
    }
  }, [needsMore, visibleCount, images.length])

  useEffect(() => {
    if (user) return
    if (sectionInView) {
      focusTimerRef.current = setTimeout(() => setShowOverlay(true), 3000)
    }
    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
    }
  }, [sectionInView, user])

  useEffect(() => {
    if (user) {
      setShowOverlay(false)
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current)
      return
    }
    if (!showOverlay) {
      returnTimerRef.current = setTimeout(() => setShowOverlay(true), 10000)
    }
    return () => {
      if (returnTimerRef.current) clearTimeout(returnTimerRef.current)
    }
  }, [showOverlay, user])

  const handleImageLoad = useCallback((src) => {
    setLoadedImages((prev) => ({ ...prev, [src]: true }))
  }, [])

  const visibleImages = images.slice(0, visibleCount)

  return (
    <section id="gallery" className="py-24 md:py-32 pl-6 bg-cream transition-colors duration-700 relative" ref={ref}>
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

        <div className="overflow-x-auto pb-6 -mb-6 scrollbar-thin">
          <div className="flex gap-4 md:gap-6">
            {visibleImages.map((img, i) => (
              <motion.div
                key={img.jpg}
                initial={{ opacity: 0, y: 20 }}
                animate={sectionInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.04 * i }}
                className="shrink-0 w-[260px] md:w-[300px] group cursor-pointer relative"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className="relative overflow-hidden rounded-sm bg-sage-light/10 h-[320px] md:h-[360px]">
                  {!loadedImages[img.jpg] && <Skeleton />}
                  <img
                    src={img.jpg}
                    alt={img.alt}
                    className={`w-full h-full object-cover block transition-opacity duration-500 ${loadedImages[img.jpg] ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => handleImageLoad(img.jpg)}
                  />
                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-500" />
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
              className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
              onClick={() => setExpanded(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative max-w-4xl max-h-[90vh] w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute -top-10 right-0 text-cream/70 hover:text-cream text-sm tracking-widest uppercase"
                  onClick={() => setExpanded(null)}
                >
                  Close
                </button>
                <img
                  src={images[expanded].jpg}
                  alt={images[expanded].alt}
                  className="w-full h-auto max-h-[85vh] object-contain rounded-sm"
                />
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
              className="absolute top-6 right-6 text-charcoal-light/40 hover:text-charcoal transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
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
