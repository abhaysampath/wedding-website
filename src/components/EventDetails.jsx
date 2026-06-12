import { useState, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/useAuth'
import weddings from '../data/weddings.json'
import WeddingSwitcher from './WeddingSwitcher'
import { linkTerms } from '../utils/glossary'

function LinkedText({ text }) {
  if (!text) return null
  const parts = linkTerms(text)
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <Fragment key={i}>{p}</Fragment>
        ) : (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold-dark hover:text-gold underline underline-offset-2 decoration-gold/30 hover:decoration-gold/60 transition-colors"
          >
            {p.word}
          </a>
        )
      )}
    </>
  )
}

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
  const { activeWedding, user } = useAuth()
  const userRole = user?.role || null
  const w = weddings[activeWedding]
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [expanded, setExpanded] = useState(null)

  const toggleEvent = (idx) => {
    setExpanded(prev => prev === idx ? null : idx)
  }

  const filteredTimeline = w.timeline.filter(event => {
    const visibility = event.visibility
    if (!visibility) return true
    if (!userRole) return visibility === 'public'
    if (userRole === 'bride' || userRole === 'groom') return true
    if (userRole === 'vendor') return visibility === 'vendor'
    if (userRole === 'close_family') return visibility === 'close_family' || visibility === 'public'
    return visibility === 'public'
  })

  return (
    <section id="details" className="py-20 md:py-32 px-6 bg-cream-dark transition-colors duration-700" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14 md:mb-20"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-4 tracking-wide">
            Event Details
          </h2>
          <div className="w-16 h-[1.5px] bg-gold mx-auto mb-8" />

          <div className="flex justify-center mb-10 md:mb-12">
            <WeddingSwitcher />
          </div>

          <div className="inline-block w-full md:w-auto border border-gold/30 rounded-sm px-6 md:px-10 py-6 md:py-8 bg-cream transition-wedding shadow-sm">
            <p className="font-heading text-2xl md:text-3xl text-gold-dark mb-2">
              {w.date}
            </p>
            <p className="text-charcoal-light text-sm md:text-base tracking-wide">
              {w.venueUrl ? (
                <a href={w.venueUrl} target="_blank" rel="noopener noreferrer" className="text-gold-dark hover:text-gold underline underline-offset-2 decoration-gold/30 hover:decoration-gold/60 transition-colors">
                  {w.venue}
                </a>
              ) : w.venue}
            </p>
            <p className="text-charcoal-light/60 text-xs md:text-sm mt-1.5">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(w.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-charcoal-light/80 transition-colors"
              >
                {w.address}
              </a>
            </p>
          </div>
        </motion.div>

        {filteredTimeline.length > 0 && (
          <div className="relative">
            <div className="absolute left-[22px] md:left-1/2 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-gold/30 via-gold/10 to-transparent -translate-x-1/2" />

            <div className="space-y-8 md:space-y-12">
              {filteredTimeline.map((event, i) => {
                const isExpanded = expanded === i
                const isVendor = userRole === 'vendor' && event.vendorHighlight
                return (
                  <motion.div
                    key={event.label}
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
                    className={`relative flex flex-col md:flex-row items-start gap-5 md:gap-0 ${
                      i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    } ${isVendor ? 'md:px-4 md:py-3 md:-mx-4 md:rounded-sm md:bg-gold/[0.04] md:border md:border-gold/20' : ''}`}
                  >
                    <div
                      className={`flex-1 pl-16 md:pl-0 cursor-pointer ${
                        i % 2 === 0
                          ? 'md:text-right md:pr-16'
                          : 'md:text-left md:pl-16'
                      }`}
                      onClick={() => toggleEvent(i)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleEvent(i) }}
                    >
                      <div className={`inline-block w-full ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                        <span className="inline-flex items-center gap-2 bg-gold/10 text-gold-dark text-xs font-medium tracking-wider uppercase px-3 py-1.5 rounded-sm mb-3">
                          {event.time}
                          {isVendor && (
                            <span className="text-[9px] bg-gold/20 text-gold-dark px-1.5 py-0.5 rounded-sm -mr-1">
                              Vendor
                            </span>
                          )}
                        </span>
                        <h3 className="font-heading text-xl md:text-2xl text-charcoal mt-1 mb-2">
                          {event.label}
                        </h3>
                        <p className="text-charcoal-light/70 text-sm md:text-base leading-relaxed">
                          <LinkedText text={event.description} />
                        </p>
                      </div>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
                            className="overflow-hidden"
                          >
                            <motion.div
                              initial={{ y: -8, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 25 }}
                              className="mt-5 pt-5 border-t border-gold/10 space-y-4"
                            >
                              {event.details && (
                                <p className="text-charcoal-light/80 text-sm md:text-base leading-relaxed">
                                  <LinkedText text={event.details} />
                                </p>
                              )}
                              <motion.div
                                initial={{ y: -4, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 25 }}
                                className="flex flex-wrap gap-4 text-xs text-charcoal-light/60"
                              >
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
                              </motion.div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        onClick={(e) => { e.stopPropagation(); toggleEvent(i) }}
                        className="mt-3 inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-gold-dark/60 hover:text-gold-dark transition-colors py-1"
                      >
                        {isExpanded ? 'Show Less' : 'More Details'}
                        <ChevronIcon open={isExpanded} />
                      </button>
                    </div>

                    <motion.div
                      animate={{
                        scale: isExpanded ? 1.15 : 1,
                        borderColor: isExpanded ? 'rgb(201, 169, 110)' : 'rgba(201, 169, 110, 0.5)',
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="absolute left-0 md:left-1/2 md:-translate-x-1/2 w-11 h-11 rounded-full border-2 border-gold/50 bg-cream flex items-center justify-center z-10 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => toggleEvent(i)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        animate={{ scale: isExpanded ? 1.4 : 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="w-3.5 h-3.5 rounded-full bg-gold"
                      />
                    </motion.div>

                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}


      </div>
    </section>
  )
}
