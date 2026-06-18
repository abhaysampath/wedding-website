import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { writeToSheet } from '../utils/sheet-write'
import { fullName } from '../utils/guest'

function PlusOneRowEditor({ guest, onSaved }) {
  const [rsvpUs, setRsvpUs] = useState(guest.rsvpUs || '')
  const [rsvpIndia, setRsvpIndia] = useState(guest.rsvpIndia || '')
  const [dietary, setDietary] = useState(guest.dietaryPreferences || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)

  const handleSave = useCallback(async () => {
    setSaving(true)
    setStatus(null)
    setError(null)
    const ok = await writeToSheet(guest.id, {
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
      setError('Save failed')
    }
  }, [guest.id, rsvpUs, rsvpIndia, dietary, onSaved])

  return (
    <div className="border border-gold/20 rounded-sm p-4 bg-cream/50">
      <p className="font-heading text-base text-charcoal mb-1">{fullName(guest)}</p>
      <p className="text-[10px] text-charcoal-light/60 mb-3 tracking-wider uppercase">
        {guest.title || 'Guest'} · ID {guest.id}
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] tracking-wider uppercase text-charcoal-light/60 mb-1">
            US RSVP
          </label>
          <select
            value={rsvpUs}
            onChange={e => setRsvpUs(e.target.value)}
            className="w-full text-sm border border-gold/20 rounded-sm px-2 py-1.5 bg-cream"
          >
            <option value="">—</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] tracking-wider uppercase text-charcoal-light/60 mb-1">
            India RSVP
          </label>
          <select
            value={rsvpIndia}
            onChange={e => setRsvpIndia(e.target.value)}
            className="w-full text-sm border border-gold/20 rounded-sm px-2 py-1.5 bg-cream"
          >
            <option value="">—</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[10px] tracking-wider uppercase text-charcoal-light/60 mb-1">
          Dietary Preferences
        </label>
        <input
          type="text"
          value={dietary}
          onChange={e => setDietary(e.target.value)}
          placeholder="e.g. vegetarian, nut allergy"
          className="w-full text-sm border border-gold/20 rounded-sm px-2 py-1.5 bg-cream"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="text-[10px] tracking-widest uppercase bg-gold/15 text-gold-dark px-3 py-1.5 rounded-sm hover:bg-gold/25 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <AnimatePresence>
          {status === 'saved' && (
            <motion.span
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-sage"
            >
              Saved
            </motion.span>
          )}
          {error && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[10px] text-red"
            >
              {error}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function PlusOneEditor({ user, guests }) {
  const [open, setOpen] = useState(false)

  const groupMembers = useMemo(() => {
    if (!user || !guests || user.plusOne !== 'Allowed+1') return []
    const userRowIndex = parseInt(String(user.id).replace(/[^\d]/g, ''), 10)
    if (isNaN(userRowIndex) || userRowIndex < 1) return []
    const members = []
    for (let i = userRowIndex; i < guests.length; i++) {
      if (guests[i].plusOne === 'Is+1') {
        members.push(guests[i])
      } else {
        break
      }
    }
    return members
  }, [user, guests])

  if (groupMembers.length === 0) return null

  return (
    <div className="mt-6 border-t border-gold/15 pt-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-left text-[10px] tracking-widest uppercase text-charcoal-light/70 hover:text-charcoal transition-colors"
      >
        <span>Edit RSVP for your guests ({groupMembers.length})</span>
        <span className="text-base leading-none">{open ? '−' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              <p className="text-[11px] text-charcoal-light/60 leading-relaxed">
                You can update the RSVP and dietary preferences for your plus-one
                {groupMembers.length > 1 ? 's' : ''}. Changes save directly to the guest list.
              </p>
              {groupMembers.map(g => (
                <PlusOneRowEditor key={g.id} guest={g} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
