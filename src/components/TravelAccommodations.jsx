import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const hotels = [
  {
    name: 'The Botanic Hotel',
    distance: '0.5 miles from venue',
    address: '123 Garden Lane, Bronx, NY',
    phone: '(555) 123-4567',
  },
  {
    name: 'Bronx Park Inn',
    distance: '1.2 miles from venue',
    address: '456 Park Ave, Bronx, NY',
    phone: '(555) 987-6543',
  },
  {
    name: 'The Pelham Grand',
    distance: '3 miles from venue',
    address: '789 Shore Rd, Bronx, NY',
    phone: '(555) 456-7890',
  },
]

export default function TravelAccommodations() {
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

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {hotels.map((hotel, i) => (
            <motion.div
              key={hotel.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 * i }}
              className="bg-cream border border-gold/20 rounded-sm p-6 hover:shadow-lg hover:shadow-sage/5 transition-shadow duration-300"
            >
              <div className="w-8 h-[1px] bg-gold mb-4" />
              <h3 className="font-heading text-xl text-charcoal mb-2">{hotel.name}</h3>
              <p className="text-charcoal-light/60 text-sm mb-1">{hotel.distance}</p>
              <p className="text-charcoal-light/50 text-xs mb-2">{hotel.address}</p>
              <p className="text-gold-dark text-xs">{hotel.phone}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-cream border border-gold/20 rounded-sm p-8 max-w-2xl mx-auto"
        >
          <h3 className="font-heading text-xl text-charcoal mb-4 text-center">Getting Here</h3>
          <div className="space-y-4 text-sm text-charcoal-light/70 leading-relaxed">
            <p>
              <strong className="text-charcoal">By Car:</strong> The New York Botanical Garden is
              located at 2900 Southern Blvd, Bronx, NY. There are several parking garages nearby.
            </p>
            <p>
              <strong className="text-charcoal">By Train:</strong> Metro-North Railroad from Grand
              Central to Botanical Garden Station. The journey takes approximately 20 minutes.
            </p>
            <p>
              <strong className="text-charcoal">By Subway:</strong> Take the 2 or 5 train to
              Pelham Parkway station, then a short taxi or bus ride to the garden.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
