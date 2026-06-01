import { motion } from 'framer-motion'
import { useAuth } from '../context/useAuth'

export default function WeddingSwitcher() {
  const { activeWedding, switchWedding, canSwitch, user } = useAuth()

  if (!canSwitch || !user) return null

  const options = [
    { value: 'us', label: 'US' },
    { value: 'india', label: 'India' },
  ]

  const isIndia = activeWedding === 'india'

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-sm border transition-all duration-700 px-2 py-1 ${
        isIndia
          ? 'bg-[#fdf6ee] border-amber-200/40 shadow-[0_2px_8px_rgba(217,119,6,0.08)]'
          : 'bg-cream-dark border-gold/15 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
      }`}
    >
        {options.map((opt) => {
          const isActive = activeWedding === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => switchWedding(opt.value)}
              className={`relative px-2.5 py-0.5 text-[10px] tracking-widest uppercase rounded-sm transition-all duration-700 ${
                isActive
                  ? isIndia
                    ? 'text-[#7c5c3e] font-medium'
                    : 'text-cream font-medium'
                  : isIndia
                    ? 'text-[#b8956e]/50 hover:text-[#7c5c3e]'
                    : 'text-charcoal-light/50 hover:text-charcoal'
              }`}
            >
              {isActive && (
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
  )
}
