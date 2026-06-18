import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[60] bg-charcoal text-cream/90 text-xs md:text-sm text-center py-2 px-4 shadow-soft"
        >
          You&rsquo;re offline &mdash; showing cached content where available.
        </motion.div>
      )}
    </AnimatePresence>
  )
}
