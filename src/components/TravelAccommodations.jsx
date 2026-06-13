import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/useAuth'
import weddings from '../data/weddings.json'
import WeddingSwitcher from './WeddingSwitcher'

function mapsUrl(address) {
  if (!address) return '#'
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}`
}

export default function TravelAccommodations() {
  const { activeWedding, user } = useAuth()
  const w = weddings[activeWedding]
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const isBrideFamily = user?.firstName && w.brideFamilyGuestNames?.includes(user.firstName)
  const hotels = isBrideFamily && w.brideFamilyHotels ? w.brideFamilyHotels : w.hotels

  return (
    <section id="travel" className="py-24 md:py-32 px-6 bg-cream-dark transition-colors duration-700" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light pt-1 mb-3">
            Travel & Accommodations
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto mb-4" />
          <p className="text-charcoal-light/60 text-sm max-w-lg mx-auto">
            Whether you're coming from near or far, we want to make your stay as comfortable as possible
          </p>

          <div className="flex justify-center mt-6">
            <WeddingSwitcher />
          </div>
        </motion.div>

        {hotels && hotels.length > 0 && (
          <div>
            {isBrideFamily && w.brideFamilyHotels && (
              <p className="text-charcoal-light/60 text-xs text-center mb-6 tracking-wide">
                Recommended for the Bride's family
              </p>
            )}
            <div className={`grid gap-6 mb-16 ${hotels.length <= 2 ? 'md:grid-cols-2 max-w-lg mx-auto' : 'md:grid-cols-3'}`}>
            {hotels.map((hotel, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 * i }}
                className="bg-cream border border-gold/20 rounded-sm p-6 hover:shadow-lg hover:shadow-sage/5 transition-shadow duration-300 transition-wedding"
              >
                <div className="w-8 h-[1px] bg-gold mb-4" />
                <h3 className="font-['Cormorant_Garamond',_serif] text-xl text-charcoal mb-2 font-semibold">
                  {hotel.name}
                  {hotel.badge && (
                    <span className="ml-2 text-[10px] tracking-wider uppercase bg-gold/10 text-gold-dark px-2 py-0.5 rounded-sm align-middle">
                      {hotel.badge}
                    </span>
                  )}
                </h3>
                {hotel.distance && <p className="text-charcoal-light/60 text-sm mb-1">{hotel.distance}</p>}
                {hotel.address && (
                  <a
                    href={mapsUrl(hotel.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-charcoal-light/50 text-xs block mb-2 hover:text-gold-dark transition-colors underline underline-offset-2"
                  >
                    {hotel.address}
                  </a>
                )}
                {hotel.website && (
                  <a
                    href={hotel.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-dark text-xs block mb-1 hover:text-gold transition-colors underline underline-offset-2"
                  >
                    Visit website →
                  </a>
                )}
                {hotel.phone && <p className="text-gold-dark text-xs">{hotel.phone}</p>}
              </motion.div>
            ))}
          </div>
          </div>
        )}

        {w.transport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-cream border border-gold/20 rounded-sm p-8 max-w-2xl mx-auto transition-wedding"
          >
            <h3 className="font-heading text-xl text-charcoal mb-4 text-center">Getting Here</h3>
            <div className="space-y-4 text-sm text-charcoal-light/70 leading-relaxed">
              {Object.entries(w.transport).map(([mode, text]) => (
                <p key={mode}>
                  <strong className="text-charcoal capitalize">
                    {mode === 'car' ? 'By Car' : mode === 'train' ? 'By Train' : mode === 'air' ? 'By Air' : 'By Subway'}:
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
