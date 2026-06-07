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

const missing = []
for (const [category, vars] of Object.entries(REQUIRED_VARS)) {
  for (const { var: name, label } of vars) {
    if (!process.env[name]) {
      missing.push({ category, name, label })
    }
  }
}

if (missing.length > 0) {
  console.error('\n❌ BUILD FAILED: Missing required environment variables:\n')
  for (const { category, name, label } of missing) {
    console.error(`   [${category}] ${label} (${name})`)
  }
  console.error('\n   Set these in your .env file or Vercel project environment variables.\n')
  process.exit(1)
}

console.log('✅ All required environment variables are set.')