import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

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

console.log('\n🔨 Running vite build...\n')
spawnSync('vite', ['build'], { stdio: 'inherit', env: process.env })