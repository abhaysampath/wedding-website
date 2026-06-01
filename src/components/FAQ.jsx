import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/useAuth'
import WeddingSwitcher from './WeddingSwitcher'

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
  const { activeWedding, content } = useAuth()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = (content.faq || []).filter(
    (f) => f.wedding === activeWedding || f.wedding === 'both'
  )

  return (
    <section id="faq" className="py-24 md:py-32 px-6 bg-cream transition-colors duration-700" ref={ref}>
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
          <div className="w-12 h-[1px] bg-gold mx-auto mb-6" />

          <div className="flex justify-center">
            <WeddingSwitcher />
          </div>
        </motion.div>

        {faqs.length === 0 ? (
          <p className="text-center text-charcoal-light/40 text-sm">FAQs coming soon</p>
        ) : (
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
        )}
      </div>
    </section>
  )
}
