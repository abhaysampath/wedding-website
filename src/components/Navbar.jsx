import { useState, useEffect } from 'react'
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
  { href: '#story', label: 'Our Story' },
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
  const { user, setShowAuthModal, signOut } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoClicked, setLogoClicked] = useState(false)

  const links = user ? authLinks : guestLinks

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
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">
        {/* Nav links - left aligned */}
        <div className={`hidden md:flex items-center gap-6 md:gap-8 ${scrolled ? 'text-charcoal-light' : 'text-cream'}`}>
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

        {/* R&A Logo + user info - right side */}
        <div className={`flex items-center gap-3 ${scrolled ? 'text-charcoal' : 'text-cream'}`}>
          {user && (
            <div className="hidden md:flex items-center gap-2 text-right">
              <div>
                <p className="text-xs font-medium leading-tight">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] opacity-60 tracking-wider uppercase">{roleLabels[user.role] || 'Guest'}</p>
              </div>
              <button
                onClick={() => { signOut(); setLogoClicked(false) }}
                className="text-[10px] opacity-40 hover:opacity-80 hover:text-red-400 transition-opacity uppercase tracking-wider ml-1"
                title="Sign out"
              >
                ✕
              </button>
            </div>
          )}

          <button
            onClick={() => setLogoClicked(!logoClicked)}
            className="relative font-heading font-semibold tracking-wide transition-all duration-300"
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

          {user && (
            <div className="md:hidden flex items-center gap-1.5">
              <span className="text-xs font-medium">{user.firstName}</span>
              <button
                onClick={() => signOut()}
                className="text-[10px] opacity-40 hover:opacity-80 transition-opacity"
                title="Sign out"
              >
                ✕
              </button>
            </div>
          )}
        </div>
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
