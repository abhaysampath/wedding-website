import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { roleLabels } from '../utils/guest'
import config, { imgUrl, imgSrcSet } from '../config'

export default function Hero() {
  const { user, openSettings, setShowAuthModal, handleFirebaseSignIn, firebaseLoading } = useAuth()
  const containerRef = useRef(null)
  const timerRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [manual, setManual] = useState(false)
  const [transitionDuration, setTransitionDuration] = useState(3)

  const { scrollY } = useScroll()
  const imageY = useTransform(scrollY, [0, 600], [0, 80])
  const overlayOpacity = useTransform(scrollY, [0, 400], [1, 0.7])
  const textY = useTransform(scrollY, [0, 400], [0, 30])
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0.6])

  const heroConfig = config.images.hero
  const baseSlides = useMemo(() =>
    heroConfig.slides.map(s => ({
      src: imgUrl(s.path),
      srcset: imgSrcSet(s.path),
      alt: s.alt,
    })),
  [heroConfig])

  const allSlides = useMemo(() => {
    const slides = user
      ? (() => {
          const personal = user.side === 'groom'
            ? heroConfig.personalized?.groom
            : user.side === 'bride'
              ? heroConfig.personalized?.bride
              : null
          return personal
            ? [{ src: imgUrl(personal.path), srcset: imgSrcSet(personal.path), alt: personal.alt }, ...baseSlides]
            : baseSlides
        })()
      : baseSlides
    return slides
  }, [user, baseSlides, heroConfig])

  const slideCountRef = useRef(allSlides.length)
  useEffect(() => {
    if (allSlides.length !== slideCountRef.current) {
      slideCountRef.current = allSlides.length
      setCurrentIndex(0)
    }
  }, [allSlides.length])

  const goTo = useCallback((i, fast = false) => {
    setTransitionDuration(fast ? 0.8 : 3)
    setCurrentIndex(i)
    setManual(true)
    setTimeout(() => setManual(false), heroConfig.interval)
  }, [heroConfig.interval])

  const goNext = useCallback((fast = false) => {
    goTo((currentIndex + 1) % allSlides.length, fast)
  }, [currentIndex, allSlides.length, goTo])

  const goPrev = useCallback(() => {
    goTo((currentIndex - 1 + allSlides.length) % allSlides.length, true)
  }, [currentIndex, allSlides.length, goTo])

  useEffect(() => {
    if (manual) return
    timerRef.current = setInterval(() => goNext(), heroConfig.interval)
    return () => clearInterval(timerRef.current)
  }, [manual, goNext, heroConfig.interval])

  const currentSlide = allSlides[currentIndex]

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center overflow-hidden select-none"
    >
      <motion.div className="absolute inset-0 bg-black" style={{ y: imageY }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide?.src || currentIndex}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: transitionDuration, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <img
              src={currentSlide?.src}
              srcSet={currentSlide?.srcset}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1920px"
              alt={currentSlide?.alt}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center top' }}
              draggable={false}
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              fetchPriority={currentIndex === 0 ? 'high' : 'low'}
              onError={(e) => {
                e.target.style.display = 'none'
                console.warn('Hero image failed to load:', currentSlide?.src)
              }}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-charcoal/40 via-charcoal/30 to-charcoal/60 pointer-events-none"
        style={{ opacity: overlayOpacity }}
      />

      {allSlides.length > 1 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
            aria-label="Previous image"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex gap-2">
            {allSlides.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i, true) }}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-cream w-4' : 'bg-cream/30 hover:bg-cream/50'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(true) }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
            aria-label="Next image"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative z-10 flex flex-col items-center w-full px-6 pt-20 md:pt-28 pointer-events-none"
      >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.3, delayChildren: 1.5 } } }}
            className="flex flex-col items-center pointer-events-auto"
          >
            <motion.p
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}
              className="font-['Cormorant_Garamond',_serif] font-bold text-cream text-base md:text-xl lg:text-2xl tracking-[0.3em] uppercase mb-3 md:mb-4 -mt-2 md:-mt-4"
            >
              We're getting married
            </motion.p>

            <motion.button
              onClick={user ? () => openSettings() : undefined}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } }}
              whileTap={user ? { scale: 0.97, transition: { type: 'spring', stiffness: 500, damping: 15 } } : undefined}
              className="font-heading text-4xl md:text-7xl lg:text-8xl font-light text-cream leading-tight text-center"
            >
              Abhay
              <span className="text-gold">&</span>
              Rebecca
            </motion.button>
          </motion.div>
        </motion.div>

      {!user ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-sm px-6"
        >
          <motion.div
            whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(255,255,255,0.15)' }}
            whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 400, damping: 12 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="bg-cream/10 backdrop-blur-md rounded-sm border border-cream/20 p-4"
          >
            <div className="flex items-center gap-3">
              <motion.div
                onClick={() => setShowAuthModal(true)}
                whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
                className="flex-1 flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-cream/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span className="text-cream/70 text-sm tracking-wide">
                  Sign in to find your invite
                </span>
              </motion.div>
              <span className="flex items-center gap-2">
                <motion.button
                  onClick={(e) => { e.stopPropagation(); handleFirebaseSignIn('google') }}
                  disabled={firebaseLoading}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
                  className="text-cream/40"
                  aria-label="Sign in with Google"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                </motion.button>

              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        >
          <div className="text-center">
            <p className="text-cream font-heading text-2xl">Welcome, {user.firstName}!</p>
            <p className="text-cream/60 text-xs mt-1">{roleLabels[user.role] || 'Guest'}</p>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
      >
        <a href="#story" className="text-cream/60 hover:text-cream/90 transition-colors">
          <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </motion.div>
    </section>
  )
}
