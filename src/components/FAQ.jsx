import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuth } from '../context/useAuth'
import WeddingSwitcher from './WeddingSwitcher'

function AccordionItem({ item, isOpen, onClick, id, panelId }) {
  return (
    <div className="border-b border-gold/10 last:border-b-0">
      <h3 className="m-0">
        <button
          type="button"
          id={id}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="w-full flex items-center justify-between py-5 px-1 text-left min-h-[48px] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded-sm hover:text-gold-dark transition-colors"
          onClick={onClick}
        >
          <span className="font-heading text-lg text-charcoal pr-4">{item.q}</span>
          <span
            className={`text-gold shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M8 2v12M2 8h12" />
            </svg>
          </span>
        </button>
      </h3>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={id}
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
  const { user, content, activeWedding } = useAuth()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [openIndex, setOpenIndex] = useState(null)

  const weddings = user?.weddings || []
  const faqs = (content.faq || []).filter(f => {
    if (!f.q || !f.a) return false
    if (f.wedding === 'hide') return false
    if (f.wedding === 'both') return true
    if (!weddings.includes(f.wedding)) return false
    if (weddings.length > 1) return f.wedding === activeWedding
    return true
  })

  return (
    <section
      id="faq"
      className="py-24 md:py-32 px-6 bg-sage-fog transition-colors duration-700"
      ref={ref}
      aria-labelledby="faq-heading"
    >
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <h2
            id="faq-heading"
            className="font-heading text-4xl md:text-5xl text-charcoal font-light pt-1 mb-3"
          >
            FAQ
          </h2>
          <div className="w-12 h-[1px] bg-sage mx-auto mb-6" />

          <div className="flex justify-center">
            <WeddingSwitcher />
          </div>
        </motion.div>

        {import.meta.env.DEV &&
          content.faq?.length > 0 &&
          content.faq.every(f => f.wedding === 'both') && (
            <div
              role="status"
              className="max-w-2xl mx-auto mb-6 p-4 border border-amber-200 bg-amber-50/60 rounded-sm text-xs text-amber-800 text-center"
            >
              FAQ filtering by wedding is not active — ensure your FAQ sheet has values like
              &ldquo;US Wedding&rdquo;, &ldquo;India Wedding&rdquo;, or &ldquo;Both Weddings&rdquo;
              in the &ldquo;WhichWedding&rdquo; column.
            </div>
          )}

        {faqs.length === 0 ? (
          <p className="text-center text-charcoal-light/65 text-sm" role="status">
            No FAQs available yet. Check back closer to the wedding date.
          </p>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-cream border border-sage/20 rounded-sm px-6 md:px-10 transition-wedding shadow-sm"
          >
            {faqs.map((item, i) => (
              <AccordionItem
                key={i}
                item={item}
                isOpen={openIndex === i}
                id={`faq-button-${i}`}
                panelId={`faq-panel-${i}`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
