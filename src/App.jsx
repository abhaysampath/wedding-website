import { useState, useEffect, Suspense, lazy, useMemo } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { MotionConfig } from 'framer-motion'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import { useScrollSpy, useSectionHash } from './hooks/useScrollSpy'
import NotFound from './components/NotFound'
import { SEO, weddingJSONLD } from './components/SEO'

const Navbar = lazy(() => import('./components/Navbar'))
const Hero = lazy(() => import('./components/Hero'))
const OurStory = lazy(() => import('./components/OurStory'))
const AuthModal = lazy(() => import('./components/AuthModal'))
const Gallery = lazy(() => import('./components/Gallery'))
const EventDetails = lazy(() => import('./components/EventDetails'))
const TravelAccommodations = lazy(() => import('./components/TravelAccommodations'))
const FAQ = lazy(() => import('./components/FAQ'))
const ContactSection = lazy(() => import('./components/ContactSection'))
const Footer = lazy(() => import('./components/Footer'))

function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const p = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100
      setProgress(Math.min(p, 100))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 w-full h-[2px] z-[60] pointer-events-none">
      <div className="h-full bg-gold transition-[width] duration-150 ease-out" style={{ width: `${progress}%` }} />
    </div>
  )
}

function NavbarSkeleton() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 h-20 bg-cream/95 backdrop-blur-md animate-pulse">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
        <div className="h-6 bg-cream-dark rounded-sm w-24" />
        <div className="h-6 bg-cream-dark rounded-sm w-24" />
      </div>
    </nav>
  )
}

function HeroSkeleton() {
  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center overflow-hidden select-none bg-charcoal">
      <div className="absolute inset-0 bg-sage-light/10 animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/40 via-charcoal/30 to-charcoal/60" />
      <div className="relative z-10 flex flex-col items-center w-full px-6 pt-20 md:pt-28">
        <div className="flex flex-col items-center">
          <div className="h-6 bg-sage-light/10 rounded-sm w-48 mx-auto mb-3 animate-pulse" />
          <div className="h-16 bg-sage-light/10 rounded-sm w-96 mx-auto animate-pulse" />
        </div>
      </div>
    </section>
  )
}

function AuthModalSkeleton() {
  return null
}

function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-charcoal/70 backdrop-blur-sm text-cream/70 hover:bg-charcoal hover:text-cream transition-all duration-300 shadow-lg"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  )
}

const SECTIONS = [
  { id: 'hero', label: 'Hero' },
  { id: 'story', label: 'Our Story' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'details', label: 'Events' },
  { id: 'travel', label: 'Travel' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
]

const RESTRICTED_SECTIONS = ['story', 'details', 'travel', 'faq']

function filterSections(user) {
  return SECTIONS.filter(s => user || !RESTRICTED_SECTIONS.includes(s.id))
}

function SectionNav() {
  const { user } = useAuth()
  const filtered = filterSections(user)
  const active = useScrollSpy(filtered.map(s => s.id), '-80px 0px -60% 0px')

  if (filtered.length === 0) return null

  return (
    <nav aria-label="Section navigation" className="fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      {filtered.map(s => (
        <button
          key={s.id}
          onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
          aria-label={s.label}
          aria-current={active === s.id ? 'true' : undefined}
          className="group relative flex items-center justify-center"
        >
          <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
            active === s.id ? 'bg-gold scale-125' : 'bg-charcoal/20 hover:bg-charcoal/40'
          }`} />
          <span className="absolute right-full mr-3 px-2 py-0.5 bg-charcoal/80 text-cream text-[10px] tracking-wider whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {s.label}
          </span>
        </button>
      ))}
    </nav>
  )
}

function BottomNav() {
  const { user } = useAuth()
  const filtered = filterSections(user)
  const active = useScrollSpy(filtered.map(s => s.id), '0px 0px -80% 0px')

  return (
    <nav aria-label="Bottom navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-cream/95 backdrop-blur-md border-t border-gold/10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-14 px-2">
        {filtered.map(s => (
          <button
            key={s.id}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
            aria-label={s.label}
            aria-current={active === s.id ? 'true' : undefined}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[9px] tracking-widest uppercase transition-colors ${
              active === s.id ? 'text-gold' : 'text-charcoal-light/40 hover:text-charcoal-light/60'
            }`}
          >
            {s.id === 'story' && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            )}
            {s.id === 'gallery' && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            )}
            {s.id === 'details' && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            )}
            {s.id === 'travel' && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="10" r="3" />
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
              </svg>
            )}
            {s.id === 'faq' && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {s.id === 'contact' && (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            )}
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function AuthSkeleton() {
  return (
    <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-start justify-center md:pt-[10vh]">
      <div className="w-full md:max-w-lg bg-cream md:rounded-sm md:shadow-2xl md:mb-8 min-h-screen md:min-h-0">
        <div className="p-4 md:p-10 animate-pulse space-y-4">
          <div className="h-10 bg-cream-dark rounded-sm w-full" />
          <div className="h-10 bg-cream-dark rounded-sm w-2/3" />
          <div className="h-32 bg-cream-dark rounded-sm w-full" />
        </div>
      </div>
    </div>
  )
}

function UserSkeleton() {
  return (
    <div className="min-h-screen bg-cream-dark flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function GallerySkeleton() {
  return (
    <section id="gallery" className="py-24 md:py-32 pl-6 bg-cream">
      <div className="max-w-7xl mx-auto text-center mb-12 pr-6">
        <div className="h-8 bg-cream-dark rounded-sm w-48 mx-auto mb-3" />
        <div className="w-12 h-[1px] bg-gold mx-auto mb-4" />
        <div className="h-4 bg-cream-dark rounded-sm w-64 mx-auto" />
      </div>
      <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="shrink-0 w-[260px] md:w-[300px] h-[320px] md:h-[360px] bg-sage-light/10 rounded-sm relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-cream/20 to-transparent" />
          </div>
        ))}
      </div>
    </section>
  )
}

function PageContent() {
  const { activeWedding, user } = useAuth()
  const pathname = useMemo(() => window.location.pathname, [])

  const isValidRoute = pathname === '/' || pathname.startsWith('/g/')

  if (!isValidRoute) {
    return (
      <>
        <SEO title="Page Not Found" description="The page you're looking for doesn't exist." noIndex />
        <NotFound />
      </>
    )
  }

  useSectionHash(filterSections(user).map(s => s.id))

  return (
    <>
      <SEO />
      <weddingJSONLD data={weddingJSONLD} />
      <div data-wedding={activeWedding} className="wedding-page min-h-screen pb-14 md:pb-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[70] focus:bg-cream focus:text-charcoal focus:px-4 focus:py-2 focus:rounded-sm focus:shadow-lg focus:outline-gold"
      >
        Skip to main content
      </a>
      <SectionNav />
      <ScrollProgress />
      <Suspense fallback={<NavbarSkeleton />}>
        <Navbar />
      </Suspense>
      <Suspense fallback={<HeroSkeleton />}>
        <Hero />
      </Suspense>
      <main id="main-content" role="main">
        <Suspense fallback={<GallerySkeleton />}>
          <Gallery />
        </Suspense>
        {user && (
          <Suspense fallback={<UserSkeleton />}>
            <OurStory />
            <EventDetails />
            <TravelAccommodations />
            <FAQ />
            <Footer />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <ContactSection />
        </Suspense>
      </main>
      <Suspense fallback={<AuthModalSkeleton />}>
        <AuthModal />
      </Suspense>
      <BackToTop />
      <BottomNav />
    </div>
  </>
)
}

export default function App() {
  return (
    <HelmetProvider>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <PageContent />
          <SpeedInsights />
          <Analytics />
        </AuthProvider>
      </MotionConfig>
    </HelmetProvider>
  )
}
