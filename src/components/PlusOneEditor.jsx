import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { writeToSheet } from '../utils/sheet-write'
import { fullName, stripPhone } from '../utils/guest'

const WEDDING_LABELS = {
  us: { short: 'US Wedding — Bronx' },
  india: { short: 'India Wedding — Chennai' },
}

function RsvpStatusBadge({ weddingKey, value }) {
  const label = WEDDING_LABELS[weddingKey]?.short || weddingKey
  const isYes = value === 'Yes'
  const isNo = value === 'No'
  return (
    <span
      aria-label={`${label}: ${value || 'not set'}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] tracking-widest uppercase ${
        isYes
          ? 'bg-gold/15 text-gold-dark'
          : isNo
            ? 'bg-cream-dark/60 text-charcoal-light/60'
            : 'bg-cream-dark/30 text-charcoal-light/40'
      }`}
    >
      <span
        className={`w-2.5 h-2.5 rounded-sm border ${
          isYes ? 'bg-gold border-gold' : 'border-charcoal-light/30'
        }`}
      />
      {weddingKey === 'us' ? 'US' : 'India'}
    </span>
  )
}

function RsvpToggle({ weddingKey, value, onChange }) {
  const label = WEDDING_LABELS[weddingKey]?.short || weddingKey
  const isYes = value === 'Yes'
  const isNo = value === 'No'
  const handleToggle = useCallback(() => {
    if (!value) onChange('Yes')
    else if (isYes) onChange('No')
    else onChange('Yes')
  }, [value, isYes, onChange])

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`${label}: ${value || 'not set'}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-xs tracking-wide transition-colors w-full ${
        isYes
          ? 'bg-gold/15 border-gold/30 text-charcoal'
          : isNo
            ? 'bg-cream-dark/50 border-gold/10 text-charcoal-light/70'
            : 'bg-cream border-gold/15 text-charcoal-light/50 hover:border-gold/25'
      }`}
    >
      <span
        className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] shrink-0 ${
          isYes ? 'bg-gold border-gold text-cream' : 'border-charcoal-light/30 text-transparent'
        }`}
      >
        {isYes && '✓'}
      </span>
      <span className="font-medium">{weddingKey === 'us' ? 'US Wedding' : 'India Wedding'}</span>
      <span className="ml-auto text-[10px] tracking-widest uppercase text-charcoal-light/50">
        {value || '—'}
      </span>
    </button>
  )
}

function PlusOneExpandedEditor({ guest, onSaved }) {
  const { content } = useAuth()
  const guestFromContent = useMemo(
    () => content?.guests?.find(g => g.id === guest.id) || null,
    [content?.guests, guest.id],
  )
  const originalFirstName = guestFromContent?.firstName || ''
  const originalLastName = guestFromContent?.lastName || ''
  const originalPhone = stripPhone(guestFromContent?.phone || '')
  const originalEmail = guestFromContent?.email || ''
  const originalAddress = guestFromContent?.address || ''
  const originalRsvpUs = guestFromContent?.rsvpUs || ''
  const originalRsvpIndia = guestFromContent?.rsvpIndia || ''
  const originalDietary = guestFromContent?.dietaryPreferences || ''

  const [firstName, setFirstName] = useState(originalFirstName)
  const [lastName, setLastName] = useState(originalLastName)
  const [phone, setPhone] = useState(originalPhone)
  const [email, setEmail] = useState(originalEmail)
  const [address, setAddress] = useState(originalAddress)
  const [rsvpUs, setRsvpUs] = useState(originalRsvpUs)
  const [rsvpIndia, setRsvpIndia] = useState(originalRsvpIndia)
  const [dietary, setDietary] = useState(originalDietary)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  const hasChanges =
    firstName !== originalFirstName ||
    lastName !== originalLastName ||
    phone !== originalPhone ||
    email !== originalEmail ||
    address !== originalAddress ||
    rsvpUs !== originalRsvpUs ||
    rsvpIndia !== originalRsvpIndia ||
    dietary !== originalDietary

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setStatus(null)
    setError(null)
    const ok = await writeToSheet(guest.id, {
      firstName,
      lastName,
      phone,
      email,
      address,
      rsvpUs,
      rsvpIndia,
      dietaryPreferences: dietary,
    })
    setSaving(false)
    if (ok) {
      setStatus('saved')
      onSaved?.()
      setTimeout(() => setStatus(null), 2500)
    } else {
      setError('Save failed. Please try again.')
    }
  }, [
    guest.id,
    firstName,
    lastName,
    phone,
    email,
    address,
    rsvpUs,
    rsvpIndia,
    dietary,
    saving,
    onSaved,
  ])

  return (
    <div className="bg-charcoal-light/10 border-t border-gold/15 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
            First Name
          </label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
          />
        </div>
        <div>
          <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Last name"
            className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
          placeholder="5551234567"
          className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
        />
      </div>
      <div>
        <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
        />
      </div>
      <div>
        <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
          Mailing Address
        </label>
        <textarea
          value={address}
          onChange={e => setAddress(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 resize-none"
          placeholder="123 Main St, City, State ZIP"
        />
      </div>
      <div className="space-y-2">
        {guest.weddings?.includes('us') && (
          <RsvpToggle weddingKey="us" value={rsvpUs} onChange={setRsvpUs} />
        )}
        {guest.weddings?.includes('india') && (
          <RsvpToggle weddingKey="india" value={rsvpIndia} onChange={setRsvpIndia} />
        )}
      </div>
      <div>
        <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
          Dietary Preferences
        </label>
        <input
          type="text"
          value={dietary}
          onChange={e => setDietary(e.target.value)}
          placeholder="e.g. vegetarian, nut allergy"
          className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="text-[11px] tracking-widest uppercase bg-gold/15 text-gold-dark px-4 py-2 rounded-sm hover:bg-gold/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <AnimatePresence>
          {status === 'saved' && (
            <motion.span
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-sage"
            >
              Saved
            </motion.span>
          )}
          {error && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-red"
            >
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function PlusOneRow({ guest }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gold/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? `Collapse ${fullName(guest)}` : `Expand ${fullName(guest)}`}
        className="w-full flex items-center gap-3 p-3 text-left bg-charcoal-light/5 hover:bg-charcoal-light/10 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-charcoal truncate">{fullName(guest)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {guest.weddings?.includes('us') && (
            <RsvpStatusBadge weddingKey="us" value={guest.rsvpUs || ''} />
          )}
          {guest.weddings?.includes('india') && (
            <RsvpStatusBadge weddingKey="india" value={guest.rsvpIndia || ''} />
          )}
        </div>
        <span
          className="shrink-0 w-7 h-7 flex items-center justify-center text-charcoal-light/50"
          aria-hidden="true"
        >
          <motion.svg
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" />
          </motion.svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <PlusOneExpandedEditor guest={guest} onSaved={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PlusOneEditor({ user, guests }) {
  const groupMembers = useMemo(() => {
    if (!user || !guests || user.plusOne !== 'Allowed+1') return []
    const rowOf = g => parseInt(String(g.id).replace(/[^\d]/g, ''), 10)
    const userRowIndex = rowOf(user)
    if (isNaN(userRowIndex) || userRowIndex < 1) return []
    const sorted = [...guests].sort((a, b) => rowOf(a) - rowOf(b))
    const members = []
    for (const g of sorted) {
      const r = rowOf(g)
      if (r <= userRowIndex) continue
      if (g.plusOne === 'Is+1') {
        members.push(g)
      } else {
        break
      }
    }
    return members
  }, [user, guests])

  if (groupMembers.length === 0) return null

  return (
    <div className="pt-5 border-t border-gold/15">
      <h3 className="text-sm tracking-widest uppercase text-charcoal-light/70 mb-3">
        RSVP on behalf of
      </h3>
      <div className="border border-gold/15 rounded-sm overflow-hidden">
        {groupMembers.map(g => (
          <PlusOneRow key={g.id} guest={g} />
        ))}
      </div>
    </div>
  )
}
