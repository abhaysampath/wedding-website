import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import weddings from '../data/weddings.json'

export default function TravelAccommodations() {
  const { activeWedding } = useAuth()
  const w = weddings[activeWedding]
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="travel" className="py-24 md:py-32 px-6 bg-cream-dark" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-3">
            Travel & Accommodations
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto mb-4" />
          <p className="text-charcoal-light/60 text-sm max-w-lg mx-auto">
            Whether you're coming from near or far, we want to make your stay as comfortable as possible
          </p>
        </motion.div>

        {w.hotels && w.hotels.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {w.hotels.map((hotel, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 * i }}
                className="bg-cream border border-gold/20 rounded-sm p-6 hover:shadow-lg hover:shadow-sage/5 transition-shadow duration-300"
              >
                <div className="w-8 h-[1px] bg-gold mb-4" />
                <h3 className="font-heading text-xl text-charcoal mb-2">{hotel.name}</h3>
                {hotel.distance && <p className="text-charcoal-light/60 text-sm mb-1">{hotel.distance}</p>}
                {hotel.address && <p className="text-charcoal-light/50 text-xs mb-2">{hotel.address}</p>}
                {hotel.phone && <p className="text-gold-dark text-xs">{hotel.phone}</p>}
              </motion.div>
            ))}
          </div>
        )}

        {w.transport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-cream border border-gold/20 rounded-sm p-8 max-w-2xl mx-auto"
          >
            <h3 className="font-heading text-xl text-charcoal mb-4 text-center">Getting Here</h3>
            <div className="space-y-4 text-sm text-charcoal-light/70 leading-relaxed">
              {Object.entries(w.transport).map(([mode, text]) => (
                <p key={mode}>
                  <strong className="text-charcoal capitalize">
                    {mode === 'car' ? 'By Car' : mode === 'train' ? 'By Train' : 'By Subway'}:
                  </strong>{' '}
                  {text}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
