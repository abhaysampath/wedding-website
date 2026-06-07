import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import config from '../config'

export default function Hero() {
  const { user, openSettings } = useAuth()
  const containerRef = useRef(null)
  const timerRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [manual, setManual] = useState(false)

  const heroConfig = config.images.hero
  const baseSlides = heroConfig.slides.map(s => ({
    src: heroConfig.dir + s.file,
    alt: s.alt,
  }))

  const allSlides = useMemo(() => {
    const slides = user
      ? (() => {
          const personal = user.side === 'groom'
            ? heroConfig.personalized.groom
            : user.side === 'bride'
              ? heroConfig.personalized.bride
              : null
          return personal
            ? [{ src: heroConfig.dir + personal.file, alt: personal.alt }, ...baseSlides]
            : baseSlides
        })()
      : baseSlides
    return slides
  }, [user, baseSlides, heroConfig])

  const goTo = useCallback((i) => {
    setCurrentIndex(i)
    setManual(true)
    setTimeout(() => setManual(false), heroConfig.interval)
  }, [heroConfig.interval])

  const goNext = useCallback(() => {
    goTo((currentIndex + 1) % allSlides.length)
  }, [currentIndex, allSlides.length, goTo])

  const goPrev = useCallback(() => {
    goTo((currentIndex - 1 + allSlides.length) % allSlides.length)
  }, [currentIndex, allSlides.length, goTo])

  useEffect(() => {
    if (manual) return
    timerRef.current = setInterval(goNext, heroConfig.interval)
    return () => clearInterval(timerRef.current)
  }, [manual, goNext, heroConfig.interval])

  const currentSlide = allSlides[currentIndex]

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-charcoal">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={currentSlide?.src}
            alt={currentSlide?.alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </AnimatePresence>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/40 via-charcoal/30 to-charcoal/60 pointer-events-none" />

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
                onClick={(e) => { e.stopPropagation(); goTo(i) }}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-cream w-4' : 'bg-cream/30 hover:bg-cream/50'}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cream/10 hover:bg-cream/20 text-cream/70 hover:text-cream transition-all backdrop-blur-sm"
            aria-label="Next image"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full px-6 pointer-events-none">
          <div className="flex flex-col items-center pointer-events-auto">
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="font-heading text-gold-light text-sm md:text-lg lg:text-xl tracking-[0.3em] uppercase mb-3 md:mb-4"
            >
              We're getting married
            </motion.p>

            <motion.button
              onClick={user ? () => openSettings() : undefined}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="font-heading text-4xl md:text-7xl lg:text-8xl font-light text-cream leading-tight text-center"
            >
              Abhay
              <span className="mx-2 md:mx-6 text-gold"> & </span>
              Rebecca
            </motion.button>
          </div>
        </div>

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
