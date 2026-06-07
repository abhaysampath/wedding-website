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

    // Navigate
    console.log('🌐 Navigating...')
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

    // Test 1: No critical page errors
    const criticalErrors = pageErrors.filter(e =>
      !e.includes('extension') && !e.includes('runtime.lastError')
    )
    assert('No critical page errors', criticalErrors.length === 0,
      criticalErrors.length > 0 ? criticalErrors[0] : undefined)

    // Test 2: Gallery heading exists
    const heading = await page.$eval('h2', els =>
      Array.from(els).find(el => el.textContent === 'Gallery')
    ).catch(() => null)
    assert('Gallery heading present', !!heading)

    // Test 3: Scroll full page without errors
    const preScrollErrors = pageErrors.length
    await autoScroll(page)
    const scrollErrors = pageErrors.length - preScrollErrors
    assert('No errors during scroll', scrollErrors === 0, `${scrollErrors} error(s)`)

    // Test 4: Sign In button exists
    const signInBtns = await page.$$('button').then(btns =>
      Promise.all(btns.map(b => b.evaluate(el => el.textContent)))
    ).then(texts => texts.filter(t => /sign.?in/i.test(t)))
    assert('Sign In button present', signInBtns.length > 0)

    // Test 5: Console errors filtered for noise
    const appErrors = consoleErrors.filter(e =>
      !e.includes('runtime.lastError') &&
      !e.includes('Receiving end does not exist') &&
      !e.includes('extension')
    )
    assert('No app console errors', appErrors.length === 0,
      appErrors.length > 0 ? appErrors[0] : undefined)

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