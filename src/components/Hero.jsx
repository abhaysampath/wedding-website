import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/useAuth'

export default function Hero() {
  const { user, setShowAuthModal } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const searchRef = useRef(null)

  const handleSearchClick = () => {
    setShowAuthModal(true)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowAuthModal(true)
    }
  }

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/hero.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/40 via-charcoal/30 to-charcoal/60" />

      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen w-full px-6">
        {/* Top section — names */}
        <div className="flex flex-col items-center pt-[12vh]">
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-heading text-gold-light text-lg md:text-xl tracking-[0.3em] uppercase mb-4"
          >
            We're getting married
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-heading text-5xl md:text-7xl lg:text-8xl font-light text-cream leading-tight text-center"
          >
            Abhay
            <span className="mx-4 md:mx-6 text-gold"> & </span>
            Rebecca
          </motion.h1>
        </div>

        {/* Bottom anchored section — search */}
        {!user && (
          <motion.div
            ref={searchRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="w-full max-w-sm pb-[15vh]"
          >
            <button
              onClick={handleSearchClick}
              className="group w-full flex items-center gap-3 bg-cream/10 hover:bg-cream/15 backdrop-blur-sm border border-cream/20 rounded-sm px-5 py-3.5 transition-all duration-300 cursor-text"
            >
              <svg className="w-4 h-4 text-cream/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span className="text-cream/50 text-sm tracking-wide group-hover:text-cream/70 transition-colors">
                Sign in to find your invite
              </span>
              <span className="ml-auto w-[1px] h-4 bg-cream/30 animate-pulse" />
            </button>
          </motion.div>
        )}

        {user && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-cream/70 text-base md:text-lg italic font-heading pb-[15vh]"
          >
            Welcome, {user.firstName}
          </motion.p>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
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
