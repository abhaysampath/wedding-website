import { spawnSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
  console.log('📄 Loaded .env file')
}

const verify = spawnSync('node', [resolve(import.meta.dirname, 'verify-env.mjs')], {
  stdio: 'inherit',
  env: process.env,
})
if (verify.status !== 0) process.exit(verify.status)

console.log('\n🔍 Validating image assets...\n')
const images = spawnSync('node', [resolve(import.meta.dirname, 'validate-images.mjs')], {
  stdio: 'inherit',
  env: process.env,
})
if (images.status !== 0) {
  console.error('❌ Image validation failed — add missing files or update config.\n')
  process.exit(images.status)
}

console.log('\n🔨 Running vite build...\n')
spawnSync('vite', ['build'], { stdio: 'inherit', env: process.env })

console.log('\n📝 Injecting version into Service Worker...')
const distSwPath = join(resolve(import.meta.dirname, '..'), 'dist', 'sw.js')
if (existsSync(distSwPath)) {
  const swContent = readFileSync(distSwPath, 'utf-8')
  const version = new Date().toISOString().replace(/[:.]/g, '-')
  const updated = swContent.replace('__SW_VERSION__', version)
  writeFileSync(distSwPath, updated, 'utf-8')
  console.log(`  → SW version: ${version}`)
} else {
  console.warn('  → dist/sw.js not found, skipping version injection')
}