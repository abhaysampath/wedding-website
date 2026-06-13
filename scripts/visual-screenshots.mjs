import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'screenshots')

const URL = process.argv[2] || 'http://localhost:3000'

const guests = [
  { name: 'unauthenticated', user: null },
  { name: 'bride', user: { id: 'g1000', firstName: 'Test', lastName: 'Bride', side: 'bride', relationship: 'The Bride', role: 'bride', weddings: ['us', 'india'], phone: '+1 5555550100' } },
  { name: 'groom', user: { id: 'g1001', firstName: 'Test', lastName: 'Groom', side: 'groom', relationship: 'The Groom', role: 'groom', weddings: ['us', 'india'], phone: '+1 5555550100' } },
  { name: 'close-family', user: { id: 'g1002', firstName: 'Test', lastName: 'CloseFamily', side: 'bride', relationship: "Abhay's Family", role: 'close_family', weddings: ['us', 'india'], phone: '+1 5555550100' } },
  { name: 'vendor', user: { id: 'g1003', firstName: 'Test', lastName: 'Vendor', side: 'bride', relationship: 'Vendor', role: 'vendor', weddings: ['us', 'india'], phone: '+1 5555550100' } },
  { name: 'guest', user: { id: 'g999', firstName: 'Test', lastName: 'User', side: 'groom', relationship: 'Friend', role: 'Guest', weddings: ['us', 'india'], phone: '+1 5555550100' } },
]

const sections = ['home', 'details', 'gallery']

function buildGuestPayload(user) {
  return {
    ...user,
    lastLogin: new Date().toISOString(),
    uid: null,
    email: '',
    plusOne: false,
    address: '',
    dietaryPreferences: '',
  }
}

async function switchToUSWedding(page) {
  try {
    await page.waitForSelector('[aria-label="US wedding"]', { timeout: 10000 })
    await page.click('[aria-label="US wedding"]')
    await page.waitForTimeout(800)
  } catch {
    // Already on US wedding
  }
}

async function scrollToSection(page, section) {
  if (section === 'home') return
  if (section === 'details') {
    await page.evaluate(() => {
      const el = document.getElementById('details')
      if (el) el.scrollIntoView({ block: 'start' })
    })
    await page.waitForTimeout(800)
  } else if (section === 'gallery') {
    await page.evaluate(() => {
      const headings = document.querySelectorAll('h2')
      for (const h of headings) {
        if (h.textContent === 'Gallery') {
          h.scrollIntoView({ block: 'start' })
          break
        }
      }
    })
    // Wait for lazy-loaded gallery images
    await page.waitForTimeout(4000)
  }
}

async function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })

  const results = []

  for (const guest of guests) {
    console.log(`\n👤 ${guest.name}`)
    const page = await context.newPage()

    // Inject guest into localStorage before any page JS runs
    if (guest.user) {
      const payload = buildGuestPayload(guest.user)
      await page.addInitScript((g) => {
        localStorage.setItem('wedding_user', JSON.stringify(g))
      }, payload)
    }

    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })

    // Authenticated users default to India wedding; switch to US
    if (guest.user) {
      await switchToUSWedding(page)
    }

    for (const section of sections) {
      const name = `${guest.name}-${section}`
      console.log(`  📸 ${name}`)
      await scrollToSection(page, section)
      await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: false })
      results.push({ role: guest.name, section, file: `${name}.png` })
    }

    await page.close()
  }

  await browser.close()

  // Generate HTML viewer
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Role Visibility Screenshots</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 24px; }
  h1 { font-size: 24px; margin-bottom: 24px; }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .filters button { padding: 8px 16px; border: 1px solid #ccc; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px; }
  .filters button.active { background: #1a1a2e; color: #fff; border-color: #1a1a2e; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
  .card { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .card img { width: 100%; display: block; }
  .card .label { padding: 12px; font-size: 13px; color: #555; }
  .card .label strong { color: #1a1a2e; }
  .section-group { margin-bottom: 32px; }
  .section-group h2 { font-size: 18px; margin-bottom: 12px; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 4px; }
</style>
</head>
<body>
<h1>Role Visibility Screenshots</h1>
<div class="filters" id="filters">
  <button data-filter="all" class="active">All</button>
  ${guests.map(g => `<button data-filter="${g.name}">${g.name.replace('-', ' ')}</button>`).join('\n  ')}
</div>
${sections.map(section => `
<div class="section-group" data-section="${section}">
  <h2>${section.charAt(0).toUpperCase() + section.slice(1)}</h2>
  <div class="grid">
    ${results.filter(r => r.section === section).map(r => `
    <div class="card" data-role="${r.role}">
      <img src="${r.file}" loading="lazy" alt="${r.role} ${r.section}">
      <div class="label"><strong>${r.role.replace('-', ' ')}</strong></div>
    </div>
    `).join('\n    ')}
  </div>
</div>
`).join('\n')}
<script>
  document.querySelectorAll('#filters button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filters button').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const filter = btn.dataset.filter
      document.querySelectorAll('.grid .card').forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.role === filter) ? '' : 'none'
      })
    })
  })
</script>
</body>
</html>`

  await writeFile(resolve(OUT, 'index.html'), html)
  console.log(`\n✅ Done! ${results.length} screenshots saved to ${OUT}`)
  console.log(`   Open ${OUT}/index.html to view`)
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
