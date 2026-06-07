/**
 * Bulk-upload GitHub secrets from your .env file.
 *
 * Prerequisites:
 *   gh auth login  (must be authenticated with repo access)
 *
 * Usage:
 *   node scripts/set-github-secrets.mjs
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
if (!existsSync(envPath)) {
  console.error('❌ .env file not found. Run this from the project root.')
  process.exit(1)
}

// Vars that should be set as GitHub secrets
const KEYS = [
  'GOOGLE_SHEET_ID',
  'GOOGLE_SERVICE_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_EMAILJS_SERVICE_ID',
  'VITE_EMAILJS_TEMPLATE_ID',
  'VITE_EMAILJS_PUBLIC_KEY',
  'VITE_RECAPTCHA_SITE_KEY',
  'RECAPTCHA_SECRET_KEY',
  'VERCEL_TOKEN',
]

const envContent = readFileSync(envPath, 'utf-8')

// Parse .env into a map
const envMap = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    envMap[key] = val
  }
}

let set = 0
let skipped = 0
let missing = 0

for (const key of KEYS) {
  const val = envMap[key]
  if (!val) {
    console.warn(`  ⏭️  ${key} — not found in .env, skipping`)
    missing++
    continue
  }
  if (key === 'VERCEL_TOKEN') {
    console.warn(`  ⏭️  ${key} — must be created manually in Vercel dashboard, skipping`)
    skipped++
    continue
  }
  try {
    execSync(`gh secret set "${key}" --body "${val.replace(/"/g, '\\"')}"`, { stdio: 'pipe' })
    console.log(`  ✅ ${key} set`)
    set++
  } catch {
    console.error(`  ❌ ${key} — failed to set`)
  }
}

console.log(`\n📊 Done: ${set} set, ${skipped} skipped, ${missing} missing`)