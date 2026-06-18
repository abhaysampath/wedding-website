import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'public', 'sitemap.xml')

describe('buildSitemap', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_SHEET_ID
    delete process.env.GOOGLE_SERVICE_EMAIL
    delete process.env.GOOGLE_PRIVATE_KEY
  })

  it('writes a sitemap with the fallback guests', async () => {
    const { buildSitemap } = await import('./build-sitemap.mjs')
    const count = await buildSitemap()
    expect(count).toBeGreaterThan(1)
    expect(existsSync(OUT)).toBe(true)
    const xml = readFileSync(OUT, 'utf8')
    expect(xml).toContain('<?xml')
    expect(xml).toContain('<urlset')
    expect(xml).toContain('https://abhayandrebecca.com/')
    expect(xml).toContain('/g/rebecca')
    expect(xml).toContain('/g/abhay')
  })

  it('respects SITE_URL override', async () => {
    process.env.SITE_URL = 'https://staging.example.com'
    const { buildSitemap } = await import('./build-sitemap.mjs')
    await buildSitemap()
    const xml = readFileSync(OUT, 'utf8')
    expect(xml).toContain('https://staging.example.com/')
    expect(xml).toContain('https://staging.example.com/g/')
  })

  it('produces valid XML structure', async () => {
    const { buildSitemap } = await import('./build-sitemap.mjs')
    await buildSitemap()
    const xml = readFileSync(OUT, 'utf8')
    const urlMatches = xml.match(/<url>/g) || []
    expect(urlMatches.length).toBeGreaterThan(0)
    expect(xml).toMatch(/<loc>[^<]+<\/loc>/)
    expect(xml).toMatch(/<changefreq>[^<]+<\/changefreq>/)
    expect(xml).toMatch(/<priority>[^<]+<\/priority>/)
  })
})
