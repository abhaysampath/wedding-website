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
import AuthModal from './components/AuthModal'
import config from './config'
import DebugSheet from './components/DebugSheet'

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
