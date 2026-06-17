import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error handler to prevent ugly error pages
if (process.env.NODE_ENV === 'production') {
  window.onerror = function (message, source, lineno, colno, error) {
    console.error('Global error caught:', { message, source, lineno, colno, error })
    // Don't let the error bubble up to show an ugly page
    return true
  }

  // Handle promise rejections
  window.onunhandledrejection = function (event) {
    console.error('Unhandled promise rejection:', event.reason)
    event.preventDefault()
  }

  // Register Service Worker for offline support and faster reload
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (installing) {
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version available. Reload to update.')
              }
            })
          }
        })
      })
      .catch(() => {
        // SW registration failed — app works fine without it
      })

    // On every page load, check for SW updates
    navigator.serviceWorker.ready.then(reg => reg.update())
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
