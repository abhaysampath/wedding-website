import { Suspense, lazy } from 'react'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/useAuth'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import OurStory from './components/OurStory'
import EventDetails from './components/EventDetails'
import Gallery from './components/Gallery'
import TravelAccommodations from './components/TravelAccommodations'
import Registry from './components/Registry'
import FAQ from './components/FAQ'
import ContactSection from './components/ContactSection'
import Footer from './components/Footer'
import config from './config'

const AuthModal = lazy(() => import('./components/AuthModal'))
const DebugSheet = lazy(() => import('./components/DebugSheet'))

function PageContent() {
  const { activeWedding, user } = useAuth()

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
      <ContactSection />
      <Suspense fallback={
        <div className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm flex items-start justify-center md:pt-[10vh]">
          <div className="w-full md:max-w-lg bg-cream md:rounded-sm md:shadow-2xl md:mb-8 min-h-screen md:min-h-0">
            <div className="p-4 md:p-10 animate-pulse space-y-4">
              <div className="h-10 bg-cream-dark rounded-sm w-full" />
              <div className="h-10 bg-cream-dark rounded-sm w-2/3" />
              <div className="h-32 bg-cream-dark rounded-sm w-full" />
            </div>
          </div>
        </div>
      }>
        <AuthModal />
      </Suspense>
      {config.debug && (
        <Suspense fallback={<div className="fixed bottom-4 right-4 z-50 w-48 h-24 bg-charcoal/90 rounded border border-green-400/30 animate-pulse" />}>
          <DebugSheet />
        </Suspense>
      )}
    </div>
  )
}

function Page() {
  return <PageContent />
}

export default function App() {
  return (
    <AuthProvider>
      <Page />
    </AuthProvider>
  )
}
