import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

export default function RSVP() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section id="rsvp" className="py-24 md:py-32 px-6 bg-cream transition-colors duration-700" ref={ref}>
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <h2 className="font-heading text-4xl md:text-5xl text-charcoal font-light mb-3">
            RSVP
          </h2>
          <div className="w-12 h-[1px] bg-gold mx-auto mb-4" />
          <p className="text-charcoal-light/60 text-sm">
            Please RSVP by April 30, 2027
          </p>
        </motion.div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-cream-dark border border-gold/20 rounded-sm p-10 text-center"
          >
            <p className="font-heading text-2xl text-gold-dark mb-3">Thank You!</p>
            <p className="text-charcoal-light/70 text-sm">
              Your RSVP has been received. We can't wait to celebrate with you!
            </p>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Your first name"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-2">
                Number of Guests
              </label>
              <select
                className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal focus:outline-none focus:border-gold/50 transition-colors"
                defaultValue=""
                required
              >
                <option value="" disabled>Select...</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-2">
                Dietary Restrictions
              </label>
              <textarea
                rows={3}
                className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors resize-none"
                placeholder="Any dietary restrictions or allergies..."
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-2">
                Message (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors resize-none"
                placeholder="Leave a note for the couple..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-sage hover:bg-sage-dark text-cream text-sm tracking-widest uppercase py-4 rounded-sm transition-colors duration-300 font-medium"
            >
              Send RSVP
            </button>
          </motion.form>
        )}
      </div>
    </section>
  )
}
