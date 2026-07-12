import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

export default function Registry() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      id="registry"
      className="py-24 md:py-32 px-6 bg-cream-dark transition-colors duration-700"
      ref={ref}
    >
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-charcoal font-light pt-1 mb-3 whitespace-nowrap">
            Registry
          </h2>
          <div className="w-12 h-[1px] bg-sage mx-auto mb-8" />
          <p className="text-charcoal-light/70 text-lg md:text-xl font-heading italic">
            Coming Soon
          </p>
        </motion.div>
      </div>
    </section>
  )
}
