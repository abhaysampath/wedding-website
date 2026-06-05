import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/useAuth'

export default function Hero() {
  const { user, setShowAuthModal, openSettings, handleFirebaseSignIn, firebaseLoading } = useAuth()
  const searchRef = useRef(null)
  const [scrollPosition, setScrollPosition] = useState(0)

  const handleSearchClick = () => {
    setShowAuthModal(true)
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/hero.jpg')",
          backgroundPositionY: `calc(50% - ${scrollPosition * 0.3}px)`,
          transition: 'background-position 0.2s ease-out',
        }}
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

          <motion.button
            onClick={user ? () => openSettings() : undefined}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-heading text-5xl md:text-7xl lg:text-8xl font-light text-cream leading-tight text-center"
          >
            Abhay
            <span className="mx-4 md:mx-6 text-gold"> & </span>
            Rebecca
          </motion.button>
        </div>

        {/* Bottom anchored section — sign in */}
        {!user && (
          <motion.div
            ref={searchRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="w-full max-w-sm pb-[15vh]"
          >
            <div
              onClick={handleSearchClick}
              className="group w-full flex items-center gap-3 bg-cream/10 hover:bg-cream/15 backdrop-blur-sm border border-cream/20 rounded-sm px-5 py-3.5 transition-all duration-300 cursor-text"
            >
              <svg className="w-4 h-4 text-cream/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <span className="text-cream/50 text-sm tracking-wide group-hover:text-cream/70 transition-colors">
                Sign in to find your invite
              </span>
              <span className="w-[1px] h-4 bg-cream/30 animate-pulse" />
              <span className="flex items-center gap-2 ml-auto">
                <button
                  onClick={(e) => { e.stopPropagation(); handleFirebaseSignIn('google') }}
                  disabled={firebaseLoading}
                  className="text-cream/40 hover:text-cream/70 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleFirebaseSignIn('facebook') }}
                  disabled={firebaseLoading}
                  className="text-cream/40 hover:text-cream/70 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
              </span>
            </div>
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
