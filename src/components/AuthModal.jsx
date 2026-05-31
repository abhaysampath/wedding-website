import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const roleLabels = {
  bride: 'Bride',
  groom: 'Groom',
  close_family: 'Close Family',
  invited_guest: 'Invited Guest',
  vendor: 'Vendor',
}

function formatRelationship(g) {
  if (g.role === 'bride' || g.role === 'groom') return 'The Bride'
  const side = useAuth ? useAuth().config.site.coupleNames[g.side] : g.side
  return `${side}'s ${g.relationship || roleLabels[g.role]?.toLowerCase()}`
}

function formatConfirmation(g, sideName) {
  if (g.role === 'bride') return `Are you ${g.firstName} ${g.lastName}?`
  if (g.role === 'groom') return `Are you ${g.firstName} ${g.lastName}?`
  return `Are you ${g.firstName} ${g.lastName}, ${sideName[g.side]}'s ${g.relationship || roleLabels[g.role]?.toLowerCase()}?`
}

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, searchGuests, signIn, updateContact, config } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [isPlusOne, setIsPlusOne] = useState(false)
  const [remember, setRemember] = useState(true)
  const [searched, setSearched] = useState(false)
  const [step, setStep] = useState('search')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [contactSaved, setContactSaved] = useState(false)

  const sideName = config.site.coupleNames

  const handleSearch = useCallback((e) => {
    e.preventDefault()
    const matches = searchGuests(firstName, lastName)
    setResults(matches.slice(0, 8))
    setSearched(true)
    setSelected(null)
    setStep('search')
  }, [firstName, lastName, searchGuests])

  const handleConfirm = useCallback(() => {
    if (selected) {
      signIn({ ...selected, plusOne: isPlusOne }, remember)
      setStep('contact')
    }
  }, [selected, isPlusOne, remember, signIn])

  const handleSkipContact = useCallback(() => {
    setShowAuthModal(false)
    resetState()
  }, [setShowAuthModal])

  const handleSaveContact = useCallback(async () => {
    await updateContact(phone, email)
    setContactSaved(true)
    setTimeout(() => {
      setShowAuthModal(false)
      resetState()
    }, 1200)
  }, [phone, email, updateContact, setShowAuthModal])

  const resetState = () => {
    setFirstName('')
    setLastName('')
    setResults([])
    setSelected(null)
    setIsPlusOne(false)
    setSearched(false)
    setStep('search')
    setPhone('')
    setEmail('')
    setContactSaved(false)
  }

  const handleCancel = useCallback(() => {
    setShowAuthModal(false)
    resetState()
  }, [setShowAuthModal])

  const guestLabel = (g) => {
    if (g.role === 'bride') return 'The Bride'
    if (g.role === 'groom') return 'The Groom'
    return `${sideName[g.side]}'s ${g.relationship || roleLabels[g.role]?.toLowerCase()}`
  }

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-cream rounded-sm w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-2xl text-charcoal">
                  {step === 'contact' ? 'Almost Done' : 'Sign In'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-charcoal-light/40 hover:text-charcoal transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {step !== 'contact' && (
                <>
                  {/* OAuth Buttons */}
                  <div className="flex gap-3 mb-6">
                    {['Google', 'Apple', 'Facebook'].map((provider) => (
                      <button
                        key={provider}
                        onClick={() => {}}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors"
                      >
                        {provider}
                      </button>
                    ))}
                  </div>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gold/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-cream px-3 text-xs text-charcoal-light/40">or search by name</span>
                    </div>
                  </div>

                  <form onSubmit={handleSearch} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-sage hover:bg-sage-dark text-cream text-xs tracking-widest uppercase py-3 rounded-sm transition-colors font-medium"
                    >
                      Find My Name
                    </button>
                  </form>

                  {searched && results.length === 0 && (
                    <div className="mt-6 text-center py-6 border border-dashed border-gold/20 rounded-sm">
                      <p className="text-charcoal-light/50 text-sm mb-1">No guests found</p>
                      <p className="text-charcoal-light/30 text-xs">Try a different spelling or use another sign-in method</p>
                    </div>
                  )}

                  {searched && results.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <p className="text-xs text-charcoal-light/50 tracking-widest uppercase mb-3">
                        {results.length > 1 ? 'Multiple matches — select yours' : 'We found you!'}
                      </p>
                      {results.map((g) => (
                        <div key={g.id}>
                          <button
                            onClick={() => {
                              setSelected(g)
                              setIsPlusOne(false)
                              setStep('confirm')
                            }}
                            className={`w-full text-left p-4 rounded-sm border transition-all duration-200 ${
                              selected?.id === g.id && step === 'confirm'
                                ? 'border-gold bg-cream-dark'
                                : 'border-gold/10 hover:border-gold/30 hover:bg-cream-dark/50'
                            }`}
                          >
                            <p className="font-heading text-lg text-charcoal">
                              {g.firstName} {g.lastName}
                            </p>
                            <p className="text-xs text-charcoal-light/50 mt-0.5 capitalize">
                              {guestLabel(g)}
                            </p>
                          </button>

                          {selected?.id === g.id && step === 'confirm' && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-3 pb-1 px-1 space-y-3">
                                <p className="text-sm text-charcoal-light/70">
                                  {formatConfirmation(g, sideName)}
                                </p>

                                <label className="flex items-center gap-2.5 text-sm text-charcoal-light/50 cursor-not-allowed">
                                  <input
                                    type="checkbox"
                                    checked={isPlusOne}
                                    onChange={() => setIsPlusOne(!isPlusOne)}
                                    className="accent-sage w-4 h-4 rounded border-gold/30 cursor-not-allowed opacity-50"
                                    disabled
                                  />
                                  <span className="text-charcoal-light/30">I am the plus one</span>
                                </label>

                                <div className="flex gap-3 pt-1">
                                  <button
                                    onClick={() => { setSelected(null); setStep('search') }}
                                    className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs text-charcoal-light hover:bg-cream-dark transition-colors"
                                  >
                                    Not me
                                  </button>
                                  <button
                                    onClick={handleConfirm}
                                    className="flex-1 py-2.5 bg-sage hover:bg-sage-dark text-cream text-xs tracking-widest uppercase rounded-sm transition-colors font-medium"
                                  >
                                    Yes, that's me
                                  </button>
                                </div>

                                <label className="flex items-center gap-2.5 text-sm text-charcoal-light/50 pt-1">
                                  <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={() => setRemember(!remember)}
                                    className="accent-sage w-4 h-4 rounded border-gold/30"
                                  />
                                  Remember this device
                                </label>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!searched && (
                    <div className="mt-6 text-center py-6 border border-dashed border-gold/10 rounded-sm">
                      <p className="text-charcoal-light/30 text-xs">
                        Your name will appear here once you search
                      </p>
                    </div>
                  )}
                </>
              )}

              {step === 'contact' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-charcoal-light/70 leading-relaxed">
                    Want to add your contact info? Optional — we'll only use it for wedding updates.
                  </p>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Phone Number <span className="text-charcoal-light/30 normal-case">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Email Address <span className="text-charcoal-light/30 normal-case">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                      placeholder="you@email.com"
                    />
                  </div>

                  {contactSaved && (
                    <div className="text-center py-2 text-sage text-sm font-medium">
                      Contact info saved!
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSkipContact}
                      className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs text-charcoal-light hover:bg-cream-dark transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleSaveContact}
                      disabled={contactSaved}
                      className="flex-1 py-2.5 bg-sage hover:bg-sage-dark disabled:bg-sage/50 text-cream text-xs tracking-widest uppercase rounded-sm transition-colors font-medium"
                    >
                      {contactSaved ? 'Saved!' : 'Save'}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
