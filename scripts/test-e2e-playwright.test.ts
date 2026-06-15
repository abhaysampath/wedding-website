import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002';

test.describe('Deployment smoke tests', () => {
  test('homepage loads and renders', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Rebecca & Abhay/);
    await expect(page.locator('h2')).toContainText('Gallery');
  });

  test('sign in flow works', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.click('text=Sign in');
    await expect(page.locator('.animate-modal-fade-in')).toBeVisible({ timeout: 5000 });
  });

  test('no console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const filtered = errors.filter(e =>
      !e.includes('runtime.lastError') &&
      !e.includes('weddingJSONLD') &&
      !e.includes('incorrect casing') &&
      !e.includes('unrecognized in this browser') &&
      !e.includes('Failed to load resource') &&
      !e.includes('status of 404') &&
      !e.includes('status of 502')
    );
    expect(filtered).toHaveLength(0);
  });

  test('auth-gated sections load when signed in', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('wedding_user', JSON.stringify({
        id: 'g001', firstName: 'Test', side: 'bride', role: 'bride'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#details')).toBeVisible();
    await expect(page.locator('#faq')).toBeVisible();
  });

  test('gallery section loads', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('#gallery')).toBeVisible();
  });

  test('hero section renders', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('#hero')).toBeVisible();
  });

  test('our story section renders', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('wedding_user', JSON.stringify({
        id: 'g001', firstName: 'Test', side: 'bride', role: 'bride'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#story')).toBeVisible();
  });

  test('event details section visible when signed in', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('wedding_user', JSON.stringify({
        id: 'g001', firstName: 'Test', side: 'bride', role: 'bride'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('#details')).toBeVisible();
  });

  test('faq section visible when signed in', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('wedding_user', JSON.stringify({
        id: 'g001', firstName: 'Test', side: 'bride', role: 'bride'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('#faq')).toBeVisible();
  });

  test('contact section renders', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('#contact')).toBeVisible();
  });

  test('travel section visible when signed in', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('wedding_user', JSON.stringify({
        id: 'g001', firstName: 'Test', side: 'bride', role: 'bride'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator('#travel')).toBeVisible();
  });

  test('registry section renders', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('wedding_user', JSON.stringify({
        id: 'g001', firstName: 'Test', side: 'bride', role: 'bride'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#registry')).toBeVisible();
  });

  test('footer renders', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.setItem('wedding_user', JSON.stringify({
        id: 'g001', firstName: 'Test', side: 'bride', role: 'bride'
      }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('footer')).toBeVisible();
  });

  test('mobile viewport works', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('#hero')).toBeVisible();
  });
});
