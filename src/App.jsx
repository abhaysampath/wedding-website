import { ClerkProvider } from '@clerk/clerk-react'
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
import WeddingSwitcher from './components/WeddingSwitcher'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

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
    <>
      <Navbar />
      <Hero />
      <OurStory />
      <WeddingSwitcher />
      <EventDetails />
      <Gallery />
      <TravelAccommodations />
      <RSVP />
      <Registry />
      <FAQ />
      <Footer />
      <AuthModal />
    </>
  )
}

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <AuthProvider>
        <Page />
      </AuthProvider>
    </ClerkProvider>
  )
}
