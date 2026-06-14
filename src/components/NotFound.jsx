import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  useEffect(() => {
    fetch('/api/alert-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: '404',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {})
  }, [])

  return (
    <section className="min-h-screen flex items-center justify-center bg-cream px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md"
      >
        <h1 className="font-heading text-6xl md:text-8xl font-light text-charcoal/10 mb-4">404</h1>
        <h2 className="font-heading text-3xl md:text-4xl text-charcoal mb-4">Page Not Found</h2>
        <p className="text-charcoal-light/60 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-cream text-sm tracking-widest uppercase px-6 py-3 rounded-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </motion.div>
    </section>
  )
}