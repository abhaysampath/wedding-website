import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const faqs = [
  {
    q: 'What is the dress code?',
    a: 'Details about attire will be shared closer to the date. Stay tuned!',
  },
  {
    q: 'Can I bring a plus one?',
    a: 'Your invitation will indicate if a plus one is included. Please check your invitation details.',
  },
  {
    q: 'What time should I arrive?',
    a: 'The ceremony begins promptly at 6:30 PM. We recommend arriving at least 15 minutes early to find your seat.',
  },
  {
    q: 'Is there parking available?',
    a: 'Yes, there is parking available at the New York Botanical Garden. We recommend arriving early as spots fill up.',
  },
  {
    q: 'Will there be vegetarian/vegan options?',
    a: 'Absolutely! We will have a variety of dietary options available. Please include any restrictions in your RSVP.',
  },
]

function AccordionItem({ item, isOpen, onClick }) {
  return (
    <div className="border-b border-gold/10 last:border-b-0">
      <button
        className="w-full flex items-center justify-between py-5 text-left"
        onClick={onClick}
      >
        <span className="font-heading text-lg text-charcoal pr-4">{item.q}</span>
        <span className={`text-gold shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M8 2v12M2 8h12" />
          </svg>
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-charcoal-light/70 text-sm leading-relaxed">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQ() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="py-24 md:py-32 px-6 bg-cream" ref={ref}>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-3">
            FAQ
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-cream-dark border border-gold/10 rounded-sm px-6 md:px-10"
        >
          {faqs.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
