import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'

const roleLabels = {
  bride: 'Bride',
  groom: 'Groom',
  close_family: 'Close Family',
  invited_guest: 'Invited Guest',
  vendor: 'Vendor',
}

const guestLinks = [
  { href: '#rsvp', label: 'RSVP' },
  { href: '#gallery', label: 'Gallery' },
]

const authLinks = [
  { href: '#story', label: 'Our Story' },
  { href: '#details', label: 'Event Details' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#travel', label: 'Travel' },
  { href: '#rsvp', label: 'RSVP' },
  { href: '#registry', label: 'Registry' },
  { href: '#faq', label: 'FAQ' },
]

export default function Navbar() {
  const { user, setShowAuthModal, signOut, canSwitch, activeWedding, switchWedding, config } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [logoHovered, setLogoHovered] = useState(false)
  const [logoClicked, setLogoClicked] = useState(false)
  const userMenuRef = useRef(null)

  const links = user ? authLinks : guestLinks

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!userMenuOpen) return
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-cream/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.06)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        {/* Nav links - left aligned */}
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

        {/* R&A Logo - right side */}
        <button
          onClick={() => {
            if (user) {
              setUserMenuOpen(!userMenuOpen)
            } else {
              setLogoClicked(!logoClicked)
            }
          }}
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          className={`relative font-heading font-semibold tracking-wide transition-all duration-300 ${
            scrolled ? 'text-charcoal' : 'text-cream'
          }`}
        >
          <AnimatePresence mode="wait">
            {!logoClicked ? (
              <motion.span
                key="short"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center justify-center w-9 h-9 rounded-sm border currentColor border-current/30 text-sm"
              >
                R&A
              </motion.span>
            ) : (
              <motion.span
                key="full"
                initial={{ width: 36, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 36, opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="inline-flex items-center h-9 rounded-sm border currentColor border-current/30 text-sm overflow-hidden whitespace-nowrap"
              >
                <span className="px-2">Abhay & Rebecca</span>
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        className={`md:hidden fixed top-4 left-4 z-50 flex flex-col gap-1.5 p-2 ${scrolled || menuOpen ? 'text-charcoal' : 'text-cream'}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        <span className={`block w-6 h-0.5 bg-current transition-transform duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-6 h-0.5 bg-current transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
        <span className={`block w-6 h-0.5 bg-current transition-transform duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* User dropdown */}
      {user && userMenuOpen && (
        <div
          ref={userMenuRef}
          className="absolute top-full right-4 md:right-6 mt-1 w-72 bg-cream border border-gold/10 rounded-sm shadow-xl"
        >
          <div className="p-4 border-b border-gold/10">
            <p className="font-heading text-lg text-charcoal">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gold-dark tracking-widest uppercase mt-0.5">
              {roleLabels[user.role] || 'Guest'}
            </p>
            {canSwitch && (
              <div className="mt-3 flex gap-2">
                {user.weddings.map((w) => (
                  <button
                    key={w}
                    onClick={() => { switchWedding(w); setUserMenuOpen(false) }}
                    className={`text-xs tracking-widest uppercase px-3 py-1.5 rounded-sm border transition-colors ${
                      activeWedding === w
                        ? 'bg-sage text-cream border-sage'
                        : 'text-charcoal-light border-gold/20 hover:border-gold/40'
                    }`}
                  >
                    {w === 'us' ? 'US' : 'India'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-2">
            {authLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setUserMenuOpen(false)}
                className="block px-3 py-2 text-sm text-charcoal-light hover:text-charcoal hover:bg-cream-dark rounded-sm transition-colors"
              >
                {l.label}
              </a>
            ))}
            <hr className="my-2 border-gold/10" />
            <button
              onClick={() => { signOut(); setUserMenuOpen(false) }}
              className="block w-full text-left px-3 py-2 text-sm text-charcoal-light/50 hover:text-red-500 hover:bg-cream-dark rounded-sm transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Mobile nav panel */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-cream/98 backdrop-blur-md z-40 flex flex-col items-center justify-center gap-6 px-6">
          {authLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm tracking-widest uppercase font-medium text-charcoal-light hover:text-gold transition-colors"
            >
              {link.label}
            </a>
          ))}
          {user && (
            <button
              onClick={() => { signOut(); setMenuOpen(false) }}
              className="text-sm tracking-widest uppercase text-charcoal-light/50 hover:text-red-500 transition-colors mt-4"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
