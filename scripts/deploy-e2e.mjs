/**
 * Deploy E2E Test Script
 * Launches a headless browser, navigates to the target URL,
 * scrolls the full page, and checks for console errors.
 *
 * Usage:
 *   node scripts/deploy-e2e.mjs <url>
 *   URLs: http://localhost:3000  (local)
 *         http://localhost:3002  (preview server)
 *         https://abhayandrebecca.com  (production)
 *
 * In CI, Puppeteer is installed by the workflow.
 * Locally: npm install --no-save puppeteer
 */

const url = process.argv[2]
if (!url) {
  console.error('Usage: node scripts/deploy-e2e.mjs <url>')
  process.exit(1)
}

console.log(`\n🧪 E2E Deployment Test\n   Target: ${url}\n`)

let testsPassed = 0
let testsFailed = 0

function assert(name, ok, detail) {
  if (ok) {
    console.log(`   ✅ ${name}`)
    testsPassed++
  } else {
    console.error(`   ❌ ${name}${detail ? ` — ${detail}` : ''}`)
    testsFailed++
  }
}

async function main() {
  let browser, page

  try {
    const puppeteer = await tryLoadPuppeteer()
    if (!puppeteer) {
      console.log('⚠️  Puppeteer not available. Skipping browser-based E2E tests.\n')
      // Fall back to HTTP health check
      const res = await fetch(url)
      assert('HTTP 200', res.status === 200, `${res.status}`)
      const text = await res.text()
      assert('HTML response', text.includes('<!DOCTYPE html>') || text.includes('<html'), 'Not HTML')
      console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed\n`)
      process.exit(testsFailed > 0 ? 1 : 0)
      return
    }

    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })
    page = await browser.newPage()

    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    let pageErrors = []
    page.on('pageerror', err => {
      pageErrors.push(err.message)
      console.error(`   🔴 Page error: ${err.message}`)
    })

    const failedRequests = []
    page.on('requestfailed', req => {
      if (req.failure()?.errorText === 'net::ERR_ABORTED' &&
          (req.url().includes('/_vercel/') || req.url().includes('/api/'))) return  // Vercel scripts & API expected off-platform
      failedRequests.push({ url: req.url(), error: req.failure()?.errorText })
    })

    // Navigate
    console.log('🌐 Navigating...')
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

    // Test 1: No critical page errors
    const criticalErrors = pageErrors.filter(e =>
      !e.includes('extension') && !e.includes('runtime.lastError')
    )
    assert('No critical page errors', criticalErrors.length === 0,
      criticalErrors.length > 0 ? criticalErrors[0] : undefined)

    // Scroll full page to trigger lazy-loaded sections
    console.log('\n📋 Scrolling through entire page...')
    const preScrollErrors = pageErrors.length
    await autoScroll(page)
    const scrollErrors = pageErrors.length - preScrollErrors
    assert('No errors during scroll', scrollErrors === 0, `${scrollErrors} error(s)`)

    // Test 2: Gallery heading exists (lazy-loaded — wait for it)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForSelector('h2', { timeout: 8000 })
    const headings = await page.$$eval('h2', els => els.map(el => el.textContent))
    assert('Gallery heading present', headings.some(h => h === 'Gallery'))

    // Test 3: Sign In text exists in Hero
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForFunction(() =>
      document.body.innerText.includes('Sign in to find your invite'),
      { timeout: 5000 }
    )
    assert('Sign In text present', true)

    // Test 4: Auth modal opens
    await page.evaluate(() => {
      const el = document.querySelector('[class*="cursor-text"], [cursor-text]')
      if (el) el.closest('div').click()
    })
    await new Promise(r => setTimeout(r, 800))
    const modal = await page.$('[aria-label*="sign" i], [role="dialog"], [class*="modal"]')
    assert('Auth modal opens on click', !!modal)

    // Test 5: Console errors filtered for noise
    const appErrors = consoleErrors.filter(e =>
      !e.includes('runtime.lastError') &&
      !e.includes('Receiving end does not exist') &&
      !e.includes('extension') &&
      !e.startsWith('Failed to load resource')  // Tracked via requestfailed instead
    )
    assert('No app console errors', appErrors.length === 0,
      appErrors.length > 0 ? appErrors[0] : undefined)

    // Test 6: No unexpected network failures (Vercel 404s are expected off-platform)
    assert('No unexpected network failures', failedRequests.length === 0,
      failedRequests.length > 0 ? `${failedRequests[0].url} — ${failedRequests[0].error}` : undefined)

    // Summary
    console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed\n`)

    if (testsFailed > 0 || pageErrors.length > 0) {
      if (criticalErrors.length > 0) {
        console.error('\nCritical errors encountered:')
        criticalErrors.forEach(e => console.error(`  • ${e}`))
      }
      process.exit(1)
    }

    console.log('✅ All E2E tests passed!')
    await browser.close()

  } catch (err) {
    console.error(`\n❌ E2E Tests FAILED:`, err.message)
    if (browser) await browser.close()
    process.exit(1)
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0
      const distance = 100
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance
        if (totalHeight >= scrollHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 50)
    })
  })
}

async function tryLoadPuppeteer() {
  try {
    const mod = await import('puppeteer')
    return mod.default
  } catch {
    return null
  }
}

main()