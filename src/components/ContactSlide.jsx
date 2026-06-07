import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import emailjs from '@emailjs/browser'
import config from '../config'
import { useAuth } from '../context/useAuth'

const RECAPTCHA_SITE_KEY = config.recaptcha.siteKey

function loadRecaptchaScript() {
  return new Promise((resolve) => {
    if (typeof window.grecaptcha !== 'undefined' && window.grecaptcha?.ready) {
      window.grecaptcha.ready(resolve)
      return
    }
    const existing = document.querySelector('script[src*="recaptcha/api.js"]')
    if (existing) {
      const check = setInterval(() => {
        if (window.grecaptcha?.ready) {
          clearInterval(check)
          window.grecaptcha.ready(resolve)
        }
      }, 100)
      return
    }
    window.__recaptchaOnload = () => {
      window.grecaptcha.ready(resolve)
    }
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}&onload=__recaptchaOnload`
    document.head.appendChild(script)
  })
}

async function getRecaptchaToken(action = 'submit') {
  try {
    await loadRecaptchaScript()
    return window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action })
  } catch {
    return null
  }
}

async function verifyRecaptchaToken(token) {
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    return res.ok
  } catch {
    return true
  }
}

export default function ContactSlide() {
  const { user } = useAuth()
  const reasons = config.images.hero.contact.reasons
  const [reason, setReason] = useState(reasons[0]?.value || '')
  const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : '')
  const [email, setEmail] = useState(user?.email || '')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    function handlePendingMsg(e) {
      const detail = e.detail
      if (typeof detail === 'string') {
        setMessage(detail)
      } else {
        if (detail.reason) setReason(detail.reason)
        if (detail.message) setMessage(detail.message)
      }
    }
    window.addEventListener('pending-contact-msg', handlePendingMsg)
    return () => window.removeEventListener('pending-contact-msg', handlePendingMsg)
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!message.trim() || !reason) return
    setSending(true)
    setStatus(null)

    const token = await getRecaptchaToken('contact_submit')
    if (token) {
      const valid = await verifyRecaptchaToken(token)
      if (!valid) {
        setStatus('error')
        setSending(false)
        return
      }
    }

    const reasonLabel = reasons.find(r => r.value === reason)?.label || reason
    const subject = `[${reasonLabel}] Contact from ${name || 'Anonymous'}`

    const { serviceId, templateId, publicKey } = config.emailjs
    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, {
          email: email || 'anonymous@wedding-site',
          name: name || 'Not provided',
          subject,
          message: message.trim(),
          reason: reasonLabel,
        }, publicKey)
        setStatus('sent')
        setMessage('')
      } catch {
        setStatus('error')
      }
    } else {
      console.log('Contact form submission:', { reason: reasonLabel, name, email, message })
      setStatus('sent')
      setMessage('')
    }
    setSending(false)
  }, [reason, name, email, message, reasons])

  if (status === 'sent') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center text-center px-6 py-16"
      >
        <div className="w-12 h-12 rounded-full bg-sage/20 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-sage" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-cream/90 font-heading text-xl mb-2">Thank You!</p>
        <p className="text-cream/60 text-sm max-w-xs">Your message has been sent. We'll get back to you soon.</p>
        <button
          onClick={() => setStatus(null)}
          className="mt-6 text-xs tracking-widest uppercase text-cream/50 hover:text-cream/80 transition-colors"
        >
          Send Another
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen w-full px-4 py-20"
    >
      <div className="w-full max-w-md">
        <p className="font-heading text-gold-light text-lg tracking-[0.3em] uppercase mb-1 text-center">
          Get in Touch
        </p>
        <p className="text-cream/50 text-xs text-center mb-8">
          We'd love to hear from you
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full bg-cream/10 border border-cream/20 rounded-sm px-4 py-3 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer"
            >
              {reasons.map((r) => (
                <option key={r.value} value={r.value} className="bg-charcoal text-cream">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full bg-cream/10 border border-cream/20 rounded-sm px-4 py-3 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email (optional)"
              className="w-full bg-cream/10 border border-cream/20 rounded-sm px-4 py-3 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message..."
              required
              rows={4}
              className="w-full bg-cream/10 border border-cream/20 rounded-sm px-4 py-3 text-sm text-cream placeholder:text-cream/30 focus:outline-none focus:border-gold/50 transition-colors resize-none"
            />
          </div>

          {status === 'error' && (
            <p className="text-xs text-red-400 text-center">Failed to send. Please try again later.</p>
          )}

          <button
            type="submit"
            disabled={sending || !message.trim() || !reason}
            className="w-full py-3 border border-cream/20 rounded-sm text-xs tracking-widest uppercase text-cream/80 hover:bg-cream/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}
