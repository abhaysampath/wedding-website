# CI/CD Setup Guide

## Architecture

On push to `main`, GitHub Actions runs this pipeline:

```
Push → Unit Tests → Build → E2E Tests → Deploy to Vercel → Smoke Test
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

Since GitHub Actions now controls production deploys, we need to prevent Vercel from auto-deploying on every push to main (which would bypass the E2E tests):

1. Go to Vercel Dashboard → Your project → **Settings → Git**
2. In **Production Branch**, change it from `main` to a branch that doesn't exist (e.g., `__ci_deploy__`)
3. Keep **Preview Deployments** enabled for all branches

This way:
- PRs and `dev` pushes get Vercel preview deployments (for manual review)
- Only GitHub Actions (after passing E2E) deploys to production

## Pipeline Flow

### On push to `dev` or PR to `main`:
1. Unit tests (`npm test`)
2. Build check (`npm run build`) — also validates env vars

### On push to `main`:
1. Unit tests
2. Build check
3. E2E tests against local preview server (headless browser)
4. Deploy to Vercel production (`vercel deploy --prebuilt --prod`)
5. Smoke test against `https://abhayandrebecca.com`

If any step fails, the whole workflow fails and nothing reaches production.

## Local Testing

```bash
npm test           # Unit tests
npm run build      # Build + env verification
npm run e2e:local  # E2E tests against localhost:3000 (needs: npm install --no-save puppeteer)
npm run e2e:prod   # E2E tests against production (after deploy)
npm run deploy     # Build + deploy to Vercel prod (needs: vercel CLI authenticated)
```
