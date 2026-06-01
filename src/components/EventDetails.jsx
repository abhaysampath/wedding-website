import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/useAuth'
import weddings from '../data/weddings.json'
import WeddingSwitcher from './WeddingSwitcher'

export default function EventDetails() {
  const { activeWedding } = useAuth()
  const w = weddings[activeWedding]
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="details" className="py-24 md:py-32 px-6 bg-cream-dark transition-colors duration-700" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-3">
            Event Details
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto mb-6" />

          <div className="flex justify-center mb-8">
            <WeddingSwitcher />
          </div>

          <div className="inline-block border border-gold/30 rounded-sm px-8 py-6 bg-cream">
            <p className="font-heading text-2xl md:text-3xl text-gold-dark mb-1">
              {w.date}
            </p>
            <p className="text-charcoal-light text-sm md:text-base tracking-wide">
              {w.venue}
            </p>
            <p className="text-charcoal-light/60 text-xs md:text-sm mt-1">
              {w.address}
            </p>
          </div>
        </motion.div>

        {w.timeline.length > 0 && (
          <div className="relative">
            <div className="absolute left-[18px] md:left-1/2 top-0 bottom-0 w-[1px] bg-gold/30 -translate-x-1/2" />

            <div className="space-y-12 md:space-y-16">
              {w.timeline.map((event, i) => (
                <motion.div
                  key={event.label}
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
                  className={`relative flex flex-col md:flex-row items-start gap-6 md:gap-0 ${
                    i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'}`}>
                    <p className="font-heading text-gold-dark text-lg md:text-xl font-medium">
                      {event.time}
                    </p>
                    <h3 className="font-heading text-xl md:text-2xl text-charcoal mt-1">
                      {event.label}
                    </h3>
                    <p className="text-charcoal-light/70 text-sm md:text-base mt-1 leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-9 h-9 rounded-full border-2 border-gold bg-cream flex items-center justify-center z-10">
                    <div className="w-3 h-3 rounded-full bg-gold" />
                  </div>

                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <p className="text-charcoal-light/60 text-sm italic">
            Attire: {w.dressCode}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
