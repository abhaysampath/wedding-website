import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkKey) {
  console.error('Missing VITE_CLERK_PUBLISHABLE_KEY — Clerk OAuth will not work')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>,
)
