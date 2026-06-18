/**
 * Pre-build environment verification
 * Throws if required environment variables are missing.
 */

const REQUIRED_VARS = {
  server: [
    { var: 'GOOGLE_SHEET_ID', label: 'Google Sheets ID' },
    { var: 'GOOGLE_SERVICE_EMAIL', label: 'Google Service Email' },
    { var: 'GOOGLE_PRIVATE_KEY', label: 'Google Private Key' },
  ],
  client: [
    { var: 'VITE_FIREBASE_API_KEY', label: 'Firebase API Key' },
    { var: 'VITE_FIREBASE_AUTH_DOMAIN', label: 'Firebase Auth Domain' },
    { var: 'VITE_FIREBASE_PROJECT_ID', label: 'Firebase Project ID' },
  ],
  email: [
    { var: 'VITE_EMAILJS_SERVICE_ID', label: 'EmailJS Service ID' },
    { var: 'VITE_EMAILJS_TEMPLATE_ID', label: 'EmailJS Template ID' },
    { var: 'VITE_EMAILJS_PUBLIC_KEY', label: 'EmailJS Public Key' },
  ],
}

const OPTIONAL_VARS = [
  { var: 'VITE_EMAILJS_CONTACT_TEMPLATE_ID', label: 'EmailJS Contact Template ID' },
  { var: 'VITE_RECAPTCHA_SITE_KEY', label: 'reCAPTCHA Site Key' },
  { var: 'RECAPTCHA_SECRET_KEY', label: 'reCAPTCHA Secret Key' },
  { var: 'FIREBASE_PROJECT_ID', label: 'Firebase Admin Project ID' },
  { var: 'FIREBASE_CLIENT_EMAIL', label: 'Firebase Admin Client Email' },
  { var: 'FIREBASE_PRIVATE_KEY', label: 'Firebase Admin Private Key' },
  { var: 'SESSION_SECRET', label: 'Session cookie HMAC secret' },
]

const missing = []
for (const [category, vars] of Object.entries(REQUIRED_VARS)) {
  for (const { var: name, label } of vars) {
    if (!process.env[name]) {
      missing.push({ category, name, label })
    }
  }
}

if (missing.length > 0) {
  console.warn('\n⚠️  Some environment variables are not set (build will proceed, features may be limited):\n')
  for (const { category, name, label } of missing) {
    console.warn(`   [${category}] ${label} (${name})`)
  }
  console.warn('\n   Set these in your .env file or Vercel project environment for full functionality.\n')
}

const hasPlaceholderKey = process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_PRIVATE_KEY.length < 200
if (hasPlaceholderKey) {
  console.warn(`\n⚠️  Google Private Key (GOOGLE_PRIVATE_KEY) appears to be a placeholder (${process.env.GOOGLE_PRIVATE_KEY.length} chars, expected ~3000+).`)
  console.warn(`   Sheet reads/writes will return "not configured" until real credentials are set.\n`)
}

const missingOptional = OPTIONAL_VARS.filter(({ var: name }) => !process.env[name])
if (missingOptional.length > 0) {
  console.warn('\n⚠️  Optional environment variables not set (some features may be limited):\n')
  for (const { var: name, label } of missingOptional) {
    console.warn(`   ${label} (${name})`)
  }
  console.warn('')
}

if (missing.length === 0) {
  console.log('✅ All required environment variables are set.')
}