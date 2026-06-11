import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { guestLabel, fullName } from '../utils/guest'

const guestLinks = [
  { href: '#gallery', label: 'Gallery' },
]

const authLinks = [
  { href: '#story', label: 'Our Story' },
  { href: '#details', label: 'Event Details' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#travel', label: 'Travel' },
  { href: '#faq', label: 'FAQ' },
]

function LogoButton({ onClick, scrolled }) {
  return (
    <button onClick={onClick} className="relative font-heading font-semibold tracking-wide">
      <motion.span
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        className="inline-flex items-center justify-center rounded-[8px] overflow-hidden transition-all duration-300 hover:bg-gold/15 hover:[box-shadow:0_4px_12px_rgba(0,0,0,0.35)]"
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

  const handleLogoClick = (sourceRef) => {
    const rect = sourceRef?.current?.getBoundingClientRect()
    if (rect) {
      window.__logoRect = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    }
    if (user) setAuthMode('settings')
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
        scrolled
          ? 'bg-cream/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.06)]'
          : 'bg-transparent'
      }`}
    >
      {/* Desktop layout */}
      <div className="hidden md:flex max-w-6xl mx-auto px-6 items-center justify-between h-20">
        <div className={`flex items-center gap-6 md:gap-8 ${scrolled ? 'text-charcoal-light' : 'text-cream'}`}>
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-xs md:text-sm tracking-widest uppercase font-medium hover:text-gold transition-colors duration-300 after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
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
                <p className="text-[10px] opacity-60 tracking-wider uppercase">{guestLabel(user, { bride: 'Rebecca', groom: 'Abhay' })}</p>
              </div>
              <button
                onClick={() => { signOut() }}
                className="text-[10px] opacity-40 hover:opacity-80 hover:text-red-400 transition-opacity uppercase tracking-wider ml-1"
                title="Sign out"
              >
                ✕
              </button>
            </div>
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
