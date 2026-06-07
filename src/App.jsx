import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import OurStory from './components/OurStory'
import config from './config'

const Gallery = lazy(() => import('./components/Gallery'))
const EventDetails = lazy(() => import('./components/EventDetails'))
const TravelAccommodations = lazy(() => import('./components/TravelAccommodations'))
const Registry = lazy(() => import('./components/Registry'))
const FAQ = lazy(() => import('./components/FAQ'))
const ContactSection = lazy(() => import('./components/ContactSection'))
const Footer = lazy(() => import('./components/Footer'))
const AuthModal = lazy(() => import('./components/AuthModal'))
const DebugSheet = lazy(() => import('./components/DebugSheet'))

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
  { id: 'registry', label: 'Registry' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
]

function SectionNav() {
  const [active, setActive] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    const ids = SECTIONS.filter(s => user || !['details', 'travel', 'registry', 'faq'].includes(s.id)).map(s => s.id)
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
      if (visible.length > 0) setActive(visible[0].target.id)
    }, { rootMargin: '-80px 0px -60% 0px', threshold: [0, 0.25, 0.5] })

    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [user])

  const filtered = SECTIONS.filter(s => user || !['details', 'travel', 'registry', 'faq'].includes(s.id))

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
    <section className="py-24 md:py-32 pl-6 bg-cream">
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

  return (
    <div data-wedding={activeWedding} className="wedding-page min-h-screen">
      <a
        href="#story"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[70] focus:bg-cream focus:text-charcoal focus:px-4 focus:py-2 focus:rounded-sm focus:shadow-lg focus:outline-gold"
      >
        Skip to content
      </a>
      <SectionNav />
      <ScrollProgress />
      <Navbar />
      <Hero />
      <OurStory />
      <Suspense fallback={<GallerySkeleton />}>
        <Gallery />
      </Suspense>
      {user && (
        <Suspense fallback={<UserSkeleton />}>
          <EventDetails />
          <TravelAccommodations />
          <Registry />
          <FAQ />
          <Footer />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <ContactSection />
      </Suspense>
      <Suspense fallback={<AuthSkeleton />}>
        <AuthModal />
      </Suspense>
      {config.debug && (
        <Suspense fallback={<div className="fixed bottom-4 right-4 z-50 w-48 h-24 bg-charcoal/90 rounded border border-green-400/30 animate-pulse" />}>
          <DebugSheet />
        </Suspense>
      )}
      <BackToTop />
    </div>
  )
}

function Page() {
  return <PageContent />
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <Page />
      </AuthProvider>
    </MotionConfig>
  )
}
