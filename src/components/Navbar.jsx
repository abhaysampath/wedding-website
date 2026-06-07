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

  { href: '#registry', label: 'Registry' },
  { href: '#faq', label: 'FAQ' },
]

function LogoButton({ logoClicked, onClick }) {
  return (
    <button onClick={onClick} className="relative font-heading font-semibold tracking-wide transition-all duration-300">
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
  )
}

export default function Navbar() {
  const { user, setShowAuthModal, setAuthMode, signOut } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoClicked, setLogoClicked] = useState(false)

  const links = user ? authLinks : guestLinks

  const handleLogoClick = () => {
    setLogoClicked(l => !l);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (user) {
        setShowAuthModal(true);
        setAuthMode('settings');
      } else {
        setShowAuthModal(true);
      }
    }, 400);
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
          <LogoButton logoClicked={logoClicked} onClick={handleLogoClick} />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex items-center justify-between px-6 h-16">
        <div className="w-10" />
        <div className={`flex items-center ${scrolled || menuOpen ? 'text-charcoal' : 'text-cream'}`}>
          <LogoButton logoClicked={logoClicked} onClick={handleLogoClick} />
        </div>
        <button
          className={`flex flex-col gap-1.5 p-2 ${scrolled || menuOpen ? 'text-charcoal' : 'text-cream'}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className={`block w-6 h-0.5 bg-current transition-transform duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-current transition-opacity duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-current transition-transform duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile nav panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-40 flex"
          >
            <div className="flex-1" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-xs bg-cream/95 backdrop-blur-xl h-full flex flex-col items-end gap-6 px-8 pt-28 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              {links.map((link) => (
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
                <>
                  <div className="w-full border-t border-gold/10 pt-4 mt-2 flex flex-col items-end gap-4">
                    <span className="text-xs text-charcoal-light/60">{user.firstName} {user.lastName}</span>
                    <button
                      onClick={() => { signOut(); setMenuOpen(false) }}
                      className="text-sm tracking-widest uppercase text-charcoal-light/50 hover:text-red-500 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
