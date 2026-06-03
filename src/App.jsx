import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import OurStory from './components/OurStory'
import EventDetails from './components/EventDetails'
import Gallery from './components/Gallery'
import TravelAccommodations from './components/TravelAccommodations'
import RSVP from './components/RSVP'
import Registry from './components/Registry'
import FAQ from './components/FAQ'
import Footer from './components/Footer'
import AuthModal from './components/AuthModal'
import config from './config'
import DebugSheet from './components/DebugSheet'

function PageContent() {
  const { activeWedding, user, setShowAuthModal } = useAuth()

  return (
    <div data-wedding={activeWedding} className="wedding-page min-h-screen">
      <Navbar />
      <Hero />
      <OurStory />
      <Gallery />
      {user && (
        <>
          <EventDetails />
          <TravelAccommodations />
          <Registry />
          <FAQ />
          <Footer />
        </>
      )}
      <div className="relative">
        <RSVP />
        {!user && (
          <div className="absolute inset-0 top-0 bg-gradient-to-b from-transparent via-cream/70 to-cream backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto pt-16">
              <button
                onClick={() => setShowAuthModal(true)}
                className="group flex items-center gap-3 bg-cream/90 hover:bg-cream border border-gold/20 rounded-sm px-5 py-3.5 transition-all duration-300 shadow-lg"
              >
                <svg className="w-4 h-4 text-charcoal-light/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span className="text-charcoal-light/60 text-sm tracking-wide group-hover:text-charcoal transition-colors">
                  Sign in to find your invite
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
      <AuthModal />
      {config.debug && <DebugSheet />}
    </div>
  )
}

function Page() {
  const { initialLoading } = useAuth()

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <PageContent />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Page />
    </AuthProvider>
  )
}
