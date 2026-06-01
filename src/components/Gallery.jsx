import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/useAuth'

const offsets = [
  { x: -10, y: -14 },
  { x: 12, y: -10 },
  { x: -8, y: 12 },
  { x: 14, y: 10 },
  { x: -12, y: -8 },
  { x: 10, y: -12 },
]

const hoverMultiplier = 1.8

export default function Gallery() {
  const { content } = useAuth()
  const ref = useRef(null)
  const [expanded, setExpanded] = useState(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const images = content.images || []

  return (
    <section id="gallery" className="py-24 md:py-32 px-6 bg-cream" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-3">
            Gallery
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto mb-4" />
          <p className="text-charcoal-light/60 text-sm max-w-md mx-auto">
            A glimpse into our journey together
          </p>
        </motion.div>

        <div className="columns-2 md:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
          {images.map((img, i) => {
            const offset = offsets[i % offsets.length]

            return (
              <motion.div
                key={img.jpg}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.05 * i }}
                className="break-inside-avoid group cursor-pointer relative"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className="relative overflow-hidden rounded-sm bg-sage-light/10">
                  <img
                    src={img.jpg}
                    alt={img.alt}
                    className="w-full h-auto object-cover block"
                    loading="lazy"
                  />

                  {img.png && (
                    <div className="absolute inset-0 pointer-events-none">
                      <img
                        src={img.png}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:duration-300"
                        style={{
                          filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.12)) drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
                          transform: `translate(${offset.x}px, ${offset.y}px) scale(1.02)`,
                          transitionProperty: 'transform, filter',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = `translate(${offset.x * hoverMultiplier}px, ${offset.y * hoverMultiplier}px) scale(1.04)`
                          e.currentTarget.style.filter = 'drop-shadow(0 12px 32px rgba(0,0,0,0.18)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(1.02)`
                          e.currentTarget.style.filter = 'drop-shadow(0 4px 16px rgba(0,0,0,0.12)) drop-shadow(0 2px 4px rgba(0,0,0,0.08))'
                        }}
                      />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 transition-colors duration-500" />
                </div>
              </motion.div>
            )
          })}
        </div>

        <AnimatePresence>
          {expanded !== null && images[expanded] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
              onClick={() => setExpanded(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="relative max-w-4xl max-h-[90vh] w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute -top-10 right-0 text-cream/70 hover:text-cream text-sm tracking-widest uppercase"
                  onClick={() => setExpanded(null)}
                >
                  Close
                </button>
                <img
                  src={images[expanded].jpg}
                  alt={images[expanded].alt}
                  className="w-full h-auto max-h-[85vh] object-contain rounded-sm"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
