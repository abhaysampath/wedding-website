import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const registries = [
  {
    name: 'Zola',
    description: 'Our complete wedding registry',
    url: '#',
  },
  {
    name: 'Crate & Barrel',
    description: 'Home goods and kitchen essentials',
    url: '#',
  },
  {
    name: 'Honeyfund',
    description: 'Contribute to our honeymoon fund',
    url: '#',
  },
]

export default function Registry() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="registry" className="py-24 md:py-32 px-6 bg-cream-dark transition-colors duration-700" ref={ref}>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-3">
            Registry
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto mb-4" />
          <p className="text-charcoal-light/60 text-sm max-w-lg mx-auto leading-relaxed">
            Your presence at our wedding is the greatest gift of all. If you wish to honor us with a
            gift, we've registered at a few places we love.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {registries.map((item, i) => (
            <motion.a
              key={item.name}
              href={item.url}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 * i }}
              className="block bg-cream border border-gold/20 rounded-sm p-8 text-center hover:shadow-lg hover:shadow-sage/5 transition-all duration-300 group"
            >
              <div className="w-8 h-[1px] bg-gold mx-auto mb-4 group-hover:w-12 transition-all duration-300" />
              <h3 className="font-heading text-xl text-charcoal mb-2">{item.name}</h3>
              <p className="text-charcoal-light/50 text-xs">{item.description}</p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  )
}
