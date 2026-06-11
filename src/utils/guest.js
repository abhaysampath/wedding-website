export const roleLabels = {
  bride: 'Bride',
  groom: 'Groom',
  close_family: 'Close Family',
  invited_guest: 'Invited Guest',
  vendor: 'Vendor',
}

export function stripPhone(raw) {
  return (raw || '').replace(/\D/g, '')
}

export function fullName(guest) {
  if (!guest) return ''
  const prefix = guest.title ? guest.title.trim() + ' ' : ''
  return `${prefix}${guest.firstName} ${guest.lastName}`.trim()
}

export function guestLabel(guest, sideName) {
  if (!guest) return ''
  if (guest.role === 'bride') return 'The Bride'
  if (guest.role === 'groom') return 'The Groom'
  if (guest.relationship) {
    return guest.relationship
  }
  const prefix = sideName[guest?.side] ? `${sideName[guest.side]}'s ` : ''
  return `${prefix}${(roleLabels[guest.role] || '').toLowerCase()}`
}
