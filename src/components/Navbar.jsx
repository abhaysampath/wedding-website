import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { guestLabel, fullName } from '../utils/guest'

const guestLinks = [{ href: '#gallery', label: 'Gallery' }]

const authLinks = [
  { href: '#story', label: 'Our Story' },
  { href: '#details', label: 'Event Details' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#travel', label: 'Travel' },
  { href: '#faq', label: 'FAQ' },
]

function LogoButton({ onClick, scrolled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative font-heading font-semibold tracking-wide"
    >
      <motion.span
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        className="inline-flex items-center justify-center rounded-[8px] overflow-hidden transition-all duration-300 hover:bg-gold/15 hover:shadow-medium"
      >
        <img
          src="/ar-logo.png"
          alt="AR"
          className={`h-12 w-auto pointer-events-none transition-all duration-300 ${scrolled ? '' : 'brightness-0 invert'}`}
        />
      </motion.span>
    </button>
  )
}

export default function Navbar() {
  const { user, setShowAuthModal, setAuthMode, signOut } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const desktopBtnRef = useRef(null)
  const mobileBtnRef = useRef(null)

  const links = user ? authLinks : guestLinks

  const handleLogoClick = sourceRef => {
    const rect = sourceRef?.current?.getBoundingClientRect()
    if (rect) {
      window.__logoRect = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    }
    if (user) setAuthMode('settings')
    setShowAuthModal(true)
  }

  const handleSignInClick = () => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-cream/95 backdrop-blur-md shadow-soft' : 'bg-transparent'
      }`}
    >
      {/* Desktop layout */}
      <div className="hidden md:flex max-w-6xl mx-auto px-6 items-center justify-between h-20">
        <div
          className={`flex items-center gap-6 md:gap-8 ${scrolled ? 'text-charcoal-light' : 'text-cream'}`}
        >
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-xs md:text-sm tracking-widest uppercase font-medium hover:text-sage transition-colors duration-300 after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-sage after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className={`flex items-center gap-3 ${scrolled ? 'text-charcoal' : 'text-cream'}`}>
          {user && (
            <div className="flex items-center gap-2 text-right">
              <div>
                <p className="text-xs font-medium leading-tight">{fullName(user)}</p>
                <p className="text-[10px] opacity-60 tracking-wider uppercase">
                  {guestLabel(user, { bride: 'Rebecca', groom: 'Abhay' })}
                </p>
              </div>
              <button
                type="button"
                onClick={e => {
                  const btn = e.currentTarget
                  if (btn.dataset.confirm === '1') {
                    signOut()
                    return
                  }
                  btn.dataset.confirm = '1'
                  btn.textContent = 'Sure?'
                  btn.setAttribute('aria-label', 'Tap again to confirm sign out')
                  setTimeout(() => {
                    if (btn.isConnected) {
                      btn.dataset.confirm = ''
                      btn.textContent = '✕'
                      btn.setAttribute('aria-label', 'Sign out')
                    }
                  }, 3000)
                }}
                className="min-h-[44px] min-w-[44px] px-2 text-[10px] opacity-40 hover:opacity-80 hover:text-red-400 transition-opacity uppercase tracking-wider ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 rounded-sm"
                aria-label="Sign out"
              >
                ✕
              </button>
            </div>
          )}
          {!user && (
            <button
              type="button"
              onClick={handleSignInClick}
              className="text-xs md:text-sm tracking-widest uppercase font-medium hover:text-sage transition-colors duration-300 after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-sage after:transition-all after:duration-300 hover:after:w-full"
            >
              Sign in
            </button>
          )}
          <div ref={desktopBtnRef}>
            <LogoButton onClick={() => handleLogoClick(desktopBtnRef)} scrolled={scrolled} />
          </div>
        </div>
      </div>

      {/* Mobile layout — icon top-right, no menu */}
      <div className="md:hidden flex items-center justify-end px-6 h-16">
        <div className={`flex items-center gap-3 ${scrolled ? 'text-charcoal' : 'text-cream'}`}>
          {user && (
            <div className="text-right">
              <p className="text-xs font-medium leading-tight">{fullName(user)}</p>
            </div>
          )}
          <div ref={mobileBtnRef}>
            <LogoButton onClick={() => handleLogoClick(mobileBtnRef)} scrolled={scrolled} />
          </div>
        </div>
      </div>
    </nav>
  )
}
