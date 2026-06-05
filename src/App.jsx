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
  const { activeWedding, user, setShowAuthModal, handleFirebaseSignIn, firebaseLoading } = useAuth()

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
            <div className="pointer-events-auto">
            <div
                onClick={() => setShowAuthModal(true)}
                className="group flex items-center gap-3 bg-cream/90 hover:bg-cream border border-gold/20 rounded-sm px-5 py-3.5 transition-all duration-300 shadow-lg cursor-pointer"
              >
                <svg className="w-4 h-4 text-charcoal-light/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span className="text-charcoal-light/60 text-sm tracking-wide group-hover:text-charcoal transition-colors">
                  Sign in to find your invite
                </span>
                <span className="w-[1px] h-4 bg-charcoal-light/20 animate-pulse" />
                <span className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFirebaseSignIn('google') }}
                    disabled={firebaseLoading}
                    className="text-charcoal-light/30 hover:text-charcoal transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleFirebaseSignIn('facebook') }}
                    disabled={firebaseLoading}
                    className="text-charcoal-light/30 hover:text-charcoal transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                </span>
              </div>
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
