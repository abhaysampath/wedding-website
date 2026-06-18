import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@fontsource/dm-sans/300.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error handler to prevent ugly error pages
if (process.env.NODE_ENV === 'production') {
  window.onerror = function (message, source, lineno, colno, error) {
    var text =
      typeof message === 'string'
        ? message
        : message && message.type
          ? message.type
          : 'Unknown error'
    var detail = error && (error.stack || error.message) ? error.stack || error.message : ''
    console.error('Global error caught:', text, source || '', lineno || '', colno || '', detail)
    return true
  }

  // Handle promise rejections
  window.onunhandledrejection = function (event) {
    var reason = event && event.reason
    var text =
      typeof reason === 'string'
        ? reason
        : reason && (reason.stack || reason.message)
          ? reason.stack || reason.message
          : 'Promise rejected'
    console.error('Unhandled promise rejection:', text)
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
