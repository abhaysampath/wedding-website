import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import ContactSlide from './ContactSlide'

export default function ContactSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.section
      id="contact"
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
      className="relative bg-charcoal"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/40 to-charcoal pointer-events-none" />
      <ContactSlide />
    </motion.section>
  )
}
