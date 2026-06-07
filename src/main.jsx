import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error handler to prevent ugly error pages
if (process.env.NODE_ENV === 'production') {
  window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error caught:', { message, source, lineno, colno, error });
    // Don't let the error bubble up to show an ugly page
    return true; 
  };
  
  // Handle promise rejections
  window.onunhandledrejection = function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // Prevent default browser behavior
    event.preventDefault();
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);