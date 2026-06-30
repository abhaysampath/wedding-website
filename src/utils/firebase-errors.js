// Map Firebase Auth error codes to user-friendly messages.
// Keep the keys lowercase; values are short, action-oriented.

const messages = {
  'auth/captcha-check-failed':
    'Phone sign-in is temporarily unavailable. Please sign in with email or try again later.',
  'auth/invalid-app-credential':
    'Phone sign-in is temporarily unavailable. Please sign in with email or try again later.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/invalid-phone-number': 'Please enter a valid US phone number.',
  'auth/missing-phone-number': 'Please enter your phone number.',
  'auth/quota-exceeded': 'SMS quota exceeded. Please try again later or contact the couple.',
  'auth/invalid-verification-code': 'That code is incorrect. Please check your SMS and try again.',
  'auth/code-expired': 'That code expired. Please request a new one.',
  'auth/invalid-credential': 'Your sign-in link is no longer valid. Please request a new one.',
  'auth/user-disabled': 'This account has been disabled. Please contact the couple.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact the couple.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/account-exists-with-different-credential':
    'This phone number is already linked to a different sign-in method.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'Pop-up was blocked. Please allow pop-ups for this site and try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
}

export function friendlyAuthError(err, fallback) {
  if (!err) return fallback || 'Something went wrong. Please try again.'
  const code = err.code || ''
  if (code && messages[code]) return messages[code]
  // Heuristics for the most common operational errors
  const msg = (err.message || '').toLowerCase()
  if (msg.includes('recaptcha')) {
    return 'Phone sign-in is temporarily unavailable. Please sign in with email or try again later.'
  }
  if (msg.includes('network')) {
    return 'Network error. Please check your connection and try again.'
  }
  return err.message || fallback || 'Something went wrong. Please try again.'
}
