import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { roleLabels } from '../utils/guest'

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
            className="group inline-flex items-center justify-center w-[72px] h-9 rounded-[8px] bg-[#F5FFFA]/20 hover:bg-[#F5FFFA]/80 overflow-hidden transition-colors duration-500"
          >
            <div className="relative w-full h-full">
              <img
                src="/Logo-BW/transparent-logo.png"
                alt=""
                className="absolute inset-0 w-full h-full object-cover scale-[1.2] [filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.15))] transition-[opacity] duration-500 group-hover:opacity-0"
              />
              <img
                src="/Logo-Color/transparent-logo.png"
                alt="R&A"
                className="absolute inset-0 w-full h-full object-cover scale-[1.2] transition-[opacity] duration-500 opacity-0 group-hover:opacity-100 [filter:drop-shadow(0_4px_12px_rgba(0,0,0,0.4))]"
              />
            </div>
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

      {/* Mobile layout — icon top-right, no menu */}
      <div className="md:hidden flex items-center justify-end px-6 h-16">
        <div className={`flex items-center ${scrolled ? 'text-charcoal' : 'text-cream'}`}>
          <LogoButton logoClicked={logoClicked} onClick={handleLogoClick} />
        </div>
      </div>
    </nav>
  )
}
