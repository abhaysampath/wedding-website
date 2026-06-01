import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

function SectionTitle({ children }) {
  return (
    <div className="text-center mb-16">
      <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-3">
        {children}
      </h2>
      <div className="w-12 h-[1px] bg-gold mx-auto" />
    </div>
  )
}

export default function OurStory() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="story" className="py-24 md:py-32 px-6 bg-cream transition-colors duration-700" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <SectionTitle>Our Story</SectionTitle>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="aspect-[4/5] bg-sage-light/20 rounded-sm overflow-hidden"
          >
            <div className="w-full h-full flex items-center justify-center text-sage/40 font-heading text-lg">
              Your Photo Here
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <p className="font-heading text-lg md:text-xl text-gold-dark italic mb-6">
              From the moment we met, we knew...
            </p>
            <div className="space-y-5 text-charcoal-light leading-relaxed text-[15px] md:text-base">
              <p>
                Our story began in the most unexpected way — a shared glance across a crowded room,
                a conversation that lasted until the cafe closed, and a connection that felt like
                coming home.
              </p>
              <p>
                Through countless adventures, shared laughter, and quiet moments in between, our
                love has grown deeper with every passing day. From exploring new cities to cooking
                dinner together on a Tuesday night, every moment with each other has been a treasure.
              </p>
              <p>
                On a golden autumn evening, surrounded by the changing leaves, Abhay got down on one
                knee and asked the question that would change everything. And with tears of joy,
                Rebecca said yes.
                <span className="text-gold ml-1">❤</span>
              </p>
              <p>
                Now, we can't wait to begin our greatest adventure yet — as husband and wife —
                surrounded by the people we love most.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
