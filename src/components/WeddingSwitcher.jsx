import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function WeddingSwitcher() {
  const { activeWedding, switchWedding, canSwitch, user } = useAuth()

  if (!canSwitch || !user) return null

  const options = user.weddings.map((w) => ({
    value: w,
    label: w === 'us' ? 'US Wedding' : 'India Wedding',
  }))

  return (
    <div className="flex items-center justify-center gap-3 my-10">
      <div className="relative flex bg-cream-dark border border-gold/15 rounded-sm p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => switchWedding(opt.value)}
            className={`relative px-5 py-2 text-xs tracking-widest uppercase rounded-sm transition-colors duration-300 ${
              activeWedding === opt.value
                ? 'text-cream'
                : 'text-charcoal-light/60 hover:text-charcoal'
            }`}
          >
            {activeWedding === opt.value && (
              <motion.div
                layoutId="wedding-pill"
                className="absolute inset-0 bg-sage rounded-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
