import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import weddings from '../data/weddings.json'

const OPTIONS = [
  { value: 'us', label: 'US' },
  { value: 'india', label: 'India' },
]

export default function WeddingSwitcher() {
  const { activeWedding, switchWedding, canSwitch, user } = useAuth()

  if (!canSwitch || !user) return null

  const isIndia = activeWedding === 'india'
  const w = weddings[activeWedding]

  const toggle = (val) => switchWedding(val)

  return (
    <div
      className={`inline-flex flex-col rounded-sm border transition-all duration-700 px-3 py-2 min-w-[180px] ${
        isIndia
          ? 'bg-[#fdf6ee] border-amber-200/40 shadow-[0_2px_8px_rgba(217,119,6,0.08)]'
          : 'bg-cream-dark border-gold/15 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
      }`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeWedding}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <p className={`text-xs font-heading font-medium leading-tight ${isIndia ? 'text-[#7c5c3e]' : 'text-charcoal'}`}>
            {w.label}
          </p>
          <p className={`text-[10px] leading-tight mt-0.5 ${isIndia ? 'text-[#b8956e]' : 'text-charcoal-light/60'}`}>
            {w.date} &middot; {w.venue}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-current/10">
        {OPTIONS.map((opt) => {
          const isOn = activeWedding === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`relative flex-1 text-[9px] tracking-widest uppercase rounded-sm py-0.5 transition-all duration-700 ${
                isOn
                  ? isIndia
                    ? 'text-[#7c5c3e] font-medium'
                    : 'text-cream font-medium'
                  : isIndia
                    ? 'text-[#b8956e]/50 hover:text-[#7c5c3e]'
                    : 'text-charcoal-light/50 hover:text-charcoal'
              }`}
            >
              {isOn && (
                <motion.div
                  layoutId="wedding-pill"
                  className={`absolute inset-0 rounded-sm transition-colors duration-700 ${
                    isIndia ? 'bg-[#e8d5b8]' : 'bg-sage'
                  }`}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
