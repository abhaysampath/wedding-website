# CI/CD Setup Guide

## Architecture

On push to `main`, GitHub Actions runs this pipeline:

```
Push → Unit Tests → Build → E2E Tests → Wait for Vercel auto-deploy → Smoke Test
```

If any step fails, the pipeline stops and nothing is deployed to production.

## Step 1: GitHub Secrets

Go to GitHub repo → **Settings → Secrets and variables → Actions** → Add these secrets:

| Secret | Value |
|--------|-------|
| `VITE_FIREBASE_API_KEY` | From `.env` or Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `ar-weddingsite.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `ar-weddingsite` |
| `VITE_EMAILJS_SERVICE_ID` | From `.env` |
| `VITE_EMAILJS_TEMPLATE_ID` | From `.env` |
| `VITE_EMAILJS_PUBLIC_KEY` | From `.env` |
| `VITE_RECAPTCHA_SITE_KEY` | From `.env` |
| `GOOGLE_SHEET_ID` | From `.env` |
| `GOOGLE_SERVICE_EMAIL` | From `.env` |
| `GOOGLE_PRIVATE_KEY` | From `.env` (paste the full key including `\n`) |
| `RECAPTCHA_SECRET_KEY` | From `.env` |
| `VERCEL_TOKEN` | **See Step 2** |

## Step 2: Create Vercel Token

1. Go to [Vercel Dashboard → Settings → Tokens](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name: `github-actions`
4. Scope: Full Account
5. Copy the token and add it as the `VERCEL_TOKEN` GitHub secret

## Step 3: Vercel Production Branch Setup

Vercel auto-deploys on every push to the production branch (`main`). The CI pipeline waits for that auto-deploy via the Vercel API and then runs a smoke test. **No CLI step is required** — the Vercel CLI reliably hangs on the Hobby plan after the deploy succeeds, so CI polls the API instead.

Production branch: `main` (the default — no change needed in the dashboard).

## Step 4: Verify Vercel "Ignored Build Step" is wired up

Vercel is configured with an "Ignored Build Step" command:

```
node scripts/vercel-ignore-step.js
```

This script **always exits 1 (build)**. It's kept in place so we can add logic later (e.g. skip docs-only commits via `[skip ci]` tags) without changing the dashboard.

If the script ever returns `0` (skip) for a branch, Vercel will cancel the deploy for that push and the CI polling step will time out. The smoke test will still run against the current production (non-fatal) so CI will pass as long as the live site is healthy.

## Pipeline Flow

### On push to `dev` or PR to `main`:
1. Unit tests (`npm test`)
2. Build check (`npm run build`) — also validates env vars

### On push to `main`:
1. Unit tests
2. Build check
3. E2E tests against local preview server (headless browser)
4. Visual preview check (mobile screenshots via Playwright)
5. **Wait for Vercel auto-deploy** — polls `https://api.vercel.com/v6/deployments?projectId=…&target=production&limit=1` until the latest deploy matches `github.sha` and state is `READY`. Times out at 200s. Non-fatal: if Vercel doesn't pick up the commit (e.g. dashboard issue), the smoke test still runs.
6. Smoke test against `https://abhayandrebecca.com`

If the smoke test fails, the whole workflow fails and the previous production deploy remains live.

## Manual production deploys

If the auto-deploy fails or you need to roll back manually, you can alias a specific deployment to `abhayandrebecca.com` via the Vercel API:

```bash
DEPLOY_ID=dpl_xxxxxxxxxxxxxxxx  # from Vercel dashboard
curl -sS -X POST "https://api.vercel.com/v2/deployments/$DEPLOY_ID/aliases" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alias":"abhayandrebecca.com"}'
```

## Local Testing

```bash
npm test           # Unit tests
npm run build      # Build + env verification
npm run e2e:local  # E2E tests against localhost:3000 (needs: npm install --no-save puppeteer)
npm run e2e:prod   # E2E tests against production
```
