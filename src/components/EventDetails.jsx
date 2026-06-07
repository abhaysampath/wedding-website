import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/useAuth'
import weddings from '../data/weddings.json'
import WeddingSwitcher from './WeddingSwitcher'

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <motion.svg
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.3 }}
      className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    >
      <path d="M6 9l6 6 6-6" />
    </motion.svg>
  )
}

export default function EventDetails() {
  const { activeWedding } = useAuth()
  const w = weddings[activeWedding]
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [expanded, setExpanded] = useState(null)

  const toggleEvent = (idx) => {
    setExpanded(prev => prev === idx ? null : idx)
  }

  return (
    <section id="details" className="py-24 md:py-32 px-6 bg-cream-dark transition-colors duration-700" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 md:mb-16"
        >
          <h2 className="font-heading text-3xl md:text-5xl text-charcoal font-light mb-3">
            Event Details
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto mb-6" />

          <div className="flex justify-center mb-8">
            <WeddingSwitcher />
          </div>

          <div className="inline-block w-full md:w-auto border border-gold/30 rounded-sm px-6 md:px-8 py-6 bg-cream transition-wedding">
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
            <div className="absolute left-[18px] md:left-1/2 top-0 bottom-0 w-[1px] bg-gold/20 -translate-x-1/2" />

            <div className="space-y-6 md:space-y-10">
              {w.timeline.map((event, i) => {
                const isExpanded = expanded === i
                return (
                  <motion.div
                    key={event.label}
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
                    className={`relative flex flex-col md:flex-row items-start gap-4 md:gap-0 ${
                      i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    <div
                      className={`flex-1 pl-14 md:pl-0 cursor-pointer ${
                        i % 2 === 0
                          ? 'md:text-right md:pr-14'
                          : 'md:text-left md:pl-14'
                      }`}
                      onClick={() => toggleEvent(i)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleEvent(i) }}
                    >
                      <div className={`inline-block w-full ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                        <span className="inline-flex items-center gap-2 bg-gold/10 text-gold-dark text-xs font-medium tracking-wider uppercase px-3 py-1 rounded-sm mb-2">
                          {event.time}
                        </span>
                        <h3 className="font-heading text-xl md:text-2xl text-charcoal mt-1">
                          {event.label}
                        </h3>
                        <p className="text-charcoal-light/70 text-sm md:text-base mt-1 leading-relaxed">
                          {event.description}
                        </p>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-gold/10 space-y-3">
                              {event.details && (
                                <p className="text-charcoal-light/80 text-sm md:text-base leading-relaxed">
                                  {event.details}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-4 text-xs text-charcoal-light/60">
                                {event.location && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <PinIcon />
                                    {event.location}
                                  </span>
                                )}
                                {event.duration && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <ClockIcon />
                                    {event.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={(e) => { e.stopPropagation(); toggleEvent(i) }}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] tracking-widest uppercase text-gold-dark/50 hover:text-gold-dark transition-colors"
                      >
                        {isExpanded ? 'Show Less' : 'More Details'}
                        <ChevronIcon open={isExpanded} />
                      </button>
                    </div>

                    <div
                      className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-9 h-9 rounded-full border-2 border-gold bg-cream flex items-center justify-center z-10 cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() => toggleEvent(i)}
                    >
                      <motion.div
                        animate={{ scale: isExpanded ? 1.3 : 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-3 h-3 rounded-full bg-gold"
                      />
                    </div>

                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-16"
        >
          <p className="text-charcoal-light/60 text-sm italic flex items-center justify-center gap-2">
            <span className="w-6 h-[1px] bg-gold/20" />
            Attire: {w.dressCode}
            <span className="w-6 h-[1px] bg-gold/20" />
          </p>
        </motion.div>
      </div>
    </section>
  )
}
