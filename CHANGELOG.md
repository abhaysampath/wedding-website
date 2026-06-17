# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-06-17 — Version 1 Benchmark

The official, stable, production-ready release of the wedding website. Audited for security, performance, and modernization. All `v1.0` critical issues resolved.

### Security

#### Fixed
- **Origin allowlist bypass (`api/_origin.js`)** — replaced `startsWith` prefix matching with exact `===` equality. Closes a bypass that would have allowed `https://abhayandrebecca.com.attacker.com`.
- **Missing origin check on `api/contact.js` and `api/alert-error.js`** — both endpoints now reject requests from non-allowlisted origins with 403.
- **HTML injection in alert emails (`api/alert-error.js`)** — user input (`type`, `url`, `userAgent`, `timestamp`, `error`) is now HTML-escaped before being interpolated into the Resend email body. Closes a phishing vector against the couple's inbox.
- **Email-link auto-sign-in bypass (`src/context/AuthProvider.jsx`)** — the `if (code === pendingCode || code)` shortcut (always true) is replaced with `if (pendingCode && code === pendingCode)`. The 6-digit code is now actually checked before the guest is signed in.
- **PII guest backup served from production (`public/guests-backup.json`)** — moved to `.backups/guests-backup.json` (gitignored, not deployed to Vercel CDN).
- **Missing security headers (`vercel.json`)** — added `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`. The full page is now CSP-locked.
- **JSON-LD with stale 2025 date and `123 Wedding Lane` placeholder (`src/data/wedding-jsonld.js`)** — now sourced from `src/data/weddings.json` with real venue names and addresses; the India ceremony is added as a `subEvent`.

#### Verified clean
- 0 npm audit vulnerabilities.
- 0 secrets in source code (all in `.env` and CI secrets).
- 0 hardcoded private keys, OAuth client secrets, or Vercel tokens in tracked files.

### Performance

#### Fixed
- **Hero LCP image preload** — top 3 hero images now `<link rel="preload" as="image" fetchpriority="high">` in `index.html`. Parallelizes the LCP fetch with JS parse.
- **Render-blocking Google Fonts** — converted to async (`media="print" onload="this.media='all'"`) with a `<noscript>` fallback. FCP no longer waits on the third-party stylesheet.
- **`Lovers in New York.woff2` preload** — preloaded via `<link rel="preload" as="font" crossorigin>` so the heading font downloads in parallel with the page.
- **rAF-throttled scroll handlers** — `ScrollProgress` and `BackToTop` in `App.jsx` now use `requestAnimationFrame` to coalesce scroll-triggered `setState`. Major improvement for INP.
- **Missing cache headers on `/fonts/*` and `/assets/*` (`vercel.json`)** — added `public, max-age=31536000, immutable` so hashed assets cache for a year.

### Modernization

#### Fixed
- **`useEffect` without dep array (`AuthModal.jsx`)** — `handleEmailCodeCompleteRef.current` update effect now has `[handleEmailCodeComplete]` as a dep. Was running on every render.
- **Unused dependency `react-router-dom`** — removed from `package.json`. Not imported anywhere in `src/` or `api/`.
- **`tsconfig.json`** — added `noUncheckedIndexedAccess: true` for stricter array/object access.
- **Icon-only close buttons missing `aria-label`** — added `aria-label="Close"` to `AuthModal` and `aria-label="Sign out"` to `Navbar`.

### Changed
- `scripts/daily-report.mjs` — writes backup to `.backups/` (not `public/`), creates the directory with `mkdirSync(..., { recursive: true })`.
- `.gitignore` — `.backups/` added.
- `.env.example` — comprehensive documentation of all env vars (no values changed).
- `vercel.json` — security headers + cache headers.

### Documentation
- **Added `AGENTS.md`** — instructions for AI coding agents and humans working on the repo.
- **Added `CHANGELOG.md`** — this file.
- **Added `SECURITY.md`** — vulnerability disclosure policy.
- **Added `docs/v1-suggestions.md`** — queued v1.x improvements ranked by criticality.
- **Updated `README.md`** — service table expanded, ContactSection linked, Resend documented.

### Verification
- Build: passes
- Unit tests: 219 / 219 pass (25 files)
- ESLint: 0 errors, 11 known warnings (all `exhaustive-deps`)
- Prettier: clean
- TypeScript: clean

### Known limitations (deferred to v1.x)
- See `docs/v1-suggestions.md` for the full list of medium/low-priority issues.
- Server-side rate limiting is not yet in place for any endpoint.
- `api/guest/:id` PATCH does not yet verify the caller's identity — the only gate is the origin check.
- Email-OTP code generation remains client-side (mitigated by the fix above; full server-side verification is queued).
- The `EventDetails` and `Gallery` components still use `role="button" tabIndex={0}` on `motion.div` elements instead of real `<button>`s (a11y).
- A few hex literals in `WeddingSwitcher.jsx` and `EventDetails.jsx` should be moved into the `@theme` block.
- Sitemap only lists the homepage — guest-profile URLs (`/g/:slug`) are not enumerated.

---

## [0.x] — Pre-1.0 development

Earlier development history is in `git log`. The v1.0 benchmark consolidates:
- Initial Vite + React 19 scaffold
- Firebase Auth (Google + Phone + Anonymous) with EmailJS verification codes
- Google Sheets-backed guest data and FAQ with daily activity reports
- Role-based visibility (bride / groom / close family / invited guest / vendor)
- Role-aware contact form with reCAPTCHA v3
- Gallery with lazy-loaded lightbox
- US/India wedding switcher
- Service Worker with versioned caching
- SEO (JSON-LD, OG, Twitter Card, sitemap, robots.txt, security.txt)
- CI/CD via GitHub Actions → Vercel prebuilt deploy
- 219 unit tests across 25 files
