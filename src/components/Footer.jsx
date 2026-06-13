import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/useAuth'
import config from '../config'
import weddings from '../data/weddings.json'

export default function Footer() {
  const { bride = '', groom = '' } = config.site.coupleNames || {}
  const { activeWedding } = useAuth()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const w = weddings[activeWedding] || {}

  return (
    <motion.footer
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
      className="bg-charcoal text-cream/60 py-16 px-6"
    >
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-12 h-[1px] bg-gold/40 mx-auto mb-6" />
        <p className="font-heading text-3xl md:text-4xl text-cream/90 font-light mb-2">
          {bride} <span className="text-gold">&</span> {groom}
        </p>
        <p className="text-sm text-cream/40 mb-6 tracking-wide">
          {w.date} &middot; {w.venue}
        </p>
        <div className="w-12 h-[1px] bg-gold/40 mx-auto mb-6" />
        <p className="text-xs text-cream/30">
          Made with love &mdash; thank you for being part of our story
        </p>
      </div>
    </motion.footer>
  )
}
