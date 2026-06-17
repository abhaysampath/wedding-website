# v1.x — Queued Improvements

Improvements identified during the v1.0 benchmark audit, ranked by criticality. None of these block the v1.0 release. They are the next batch of work for v1.1, v1.2, etc.

**How to read this doc**:
- **Criticality** is the impact × likelihood if the issue is exploited in production.
- **Effort** is rough (S = hours, M = 1–2 days, L = 3+ days).
- Each item has: what it is, why it matters, the proposed fix, and the test plan.

---

## P0 — Server-side authorization (weeks away from ship)

### 1. `api/guest/:id` PATCH has no per-guest authorization

**File**: `api/guest/[id].js:4-98`

**Issue**: The endpoint accepts a PATCH from any allowlisted origin with no check that the caller actually owns the row. A signed-in guest can rewrite another guest's email/phone/address/dietary/RSVP by passing that row index.

**Fix**:
- Server verifies a Firebase ID token from the `Authorization: Bearer <token>` header.
- The token's `uid` (or `email`) is matched against the row's `email` / `phone` / sheet row to confirm ownership.
- The `bride` / `groom` / `close_family` roles get write access; `invited_guest` gets a 403.
- On mismatch, return 403, do not partially write.

**Effort**: M | **Criticality**: High

**Tests**:
- Unit: PATCH with no token → 401
- Unit: PATCH with valid token but wrong `uid` → 403
- Unit: PATCH with valid token and matching guest → 200, sheet updated
- Unit: PATCH with `groom` token trying to edit a non-owned row → 200 (allowed for couple/close family)
- E2E: sign in as guest A, attempt to PATCH guest B's row, expect 403

---

### 2. Email-OTP code is client-generated and client-verified

**Files**: `src/utils/verifyEmail.js`, `src/context/AuthProvider.jsx`

**Issue**: The 6-digit code is generated with `Math.random()` in the browser, stored in a module-level variable and `sessionStorage`, and verified with a string compare. The client can read the code from `sessionStorage` directly. The current bypass-via-`?code=` has been fixed, but the underlying model (client-trusted code) is unsound.

**Fix**:
- Move generation server-side: a new `/api/email/send-code` endpoint generates the code, stores it (Vercel KV or in-memory with TTL), and triggers the email via Resend server-side.
- `/api/email/verify-code` accepts `{ slug, code }` and returns a short-lived signed JWT (`__Host-` cookie).
- The client sends the JWT to `/api/guest/:id` PATCH (combines with item 1 above).
- Remove the public EmailJS public key from the bundle (no client-side sending).

**Effort**: L (need Vercel KV, new endpoints, mail migration) | **Criticality**: High

**Tests**:
- Unit: send-code returns 200 only if email matches a sheet row
- Unit: verify-code with wrong code returns 401
- Unit: verify-code with correct code returns JWT, subsequent PATCH with JWT succeeds
- E2E: full email-link sign-in flow on production

---

## P1 — Operational hardening

### 3. Rate limiting on `/api/*` endpoints

**Files**: all `api/*.js`

**Issue**: No rate limit on `contact.js`, `alert-error.js`, `content.js`, or `guest/[id].js`. A bot can spam the contact endpoint (each call costs a reCAPTCHA verify against Google), hammer Sheets, or post fake alert errors.

**Fix**:
- Add an in-memory token-bucket rate limiter keyed by IP for each endpoint.
- Cloudflare Turnstile or Vercel KV for distributed rate limiting if multi-region.
- Specific limits: contact 5/min, alert-error 30/min, content 60/min, guest PATCH 10/min.

**Effort**: S (in-memory) or M (KV) | **Criticality**: Medium

**Tests**:
- Unit: 100 sequential calls → first N succeed, rest 429

---

### 4. Server-side memoization of `api/content.js` (Google Sheets)

**File**: `api/content.js`

**Issue**: Every page mount of `AuthProvider` calls `fetch('/api/content')`, which hits Google Sheets. No caching. ~200-600 ms warm, ~1-3 s cold.

**Fix**:
- In-memory cache keyed by `SHEET_ID` with 60-second TTL.
- On update (a guest writes via `guest/[id].js`), invalidate the cache for that sheet.
- Optionally move to Vercel KV for cross-region cache.

**Effort**: S | **Criticality**: Medium

**Tests**:
- Unit: two calls within TTL → one Sheets call total
- Unit: call after guest PATCH → fresh data

---

### 5. Memoize the Sheet column map in `guest/[id].js`

**File**: `api/guest/[id].js`

**Issue**: The handler reads `A1:Z1` (column headers) on every request to build the `updates` array. This is wasteful — column names are static.

**Fix**:
- Read column map once per Lambda instance, cache in a module-level variable.
- The "add a column" workflow requires a redeploy anyway.

**Effort**: S | **Criticality**: Low (perf)

---

## P2 — Accessibility

### 6. `role="button"` on `motion.div` should be real `<button>`

**Files**: `src/components/Hero.jsx`, `src/components/Gallery.jsx`, `src/components/EventDetails.jsx`

**Issue**: Interactive elements with `role="button" tabIndex={0}` lack keyboard handling, form-submission semantics, and screen-reader friendliness.

**Fix**:
- Replace with `<motion.button>` (framer-motion's button variant) where the element is genuinely a button.
- For elements that need `motion.div` styling, use `<button>` as the wrapper and apply motion props.

**Effort**: M | **Criticality**: Medium (a11y)

---

### 7. Focus restoration on modal close

**Files**: `src/components/AuthModal.jsx`, `src/components/Gallery.jsx`

**Issue**: When the auth modal or lightbox closes, focus is lost (returned to `<body>`). Keyboard and screen-reader users have to re-tab to where they were.

**Fix**:
- Capture `document.activeElement` on open in a `useRef`.
- On close, `ref.current?.focus()`.

**Effort**: S | **Criticality**: Medium (a11y)

---

### 8. Adopt `jest-axe` for a11y regression testing

**Files**: `src/components/**.test.jsx`

**Issue**: Despite a lot of a11y work in the markup, no automated test guards against regressions.

**Fix**:
- Add `@axe-core/react` to test deps.
- Wrap every component test with `axe(container)` and `expect(axeResults).toHaveNoViolations()`.

**Effort**: M | **Criticality**: Medium (a11y)

---

### 9. Tailwind v4 theme audit — move hex literals to `@theme`

**Files**: `src/components/WeddingSwitcher.jsx`, `src/components/EventDetails.jsx`, `src/components/Navbar.jsx`

**Issue**: A handful of hex values (`#fdf6ee`, `#e8d5b8`, `rgb(201,169,110)`) bypass the theme tokens. They should be added to `@theme` in `src/index.css` and referenced as `bg-wedding-pill`, `border-gold-soft`, etc.

**Fix**:
- Audit all `bg-[#...]`, `text-[#...]`, `border-[#...]` usages.
- Add tokens to `@theme`.
- Replace inline hex with token names.

**Effort**: S | **Criticality**: Low

---

## P3 — Performance

### 10. Self-host Google Fonts (eliminate render-blocking)

**File**: `index.html`

**Issue**: The Google Fonts CSS stylesheet is now async, but the WOFF2 files still come from a third party. A render-time failure of `fonts.gstatic.com` is rare but possible.

**Fix**:
- Use Fontsource to bundle Cormorant Garamond and DM Sans as npm packages.
- Move `@font-face` rules into the bundle.
- Remove the `<link>` to Google Fonts.

**Effort**: S | **Criticality**: Low

---

### 11. Drop `layoutId` from Gallery tiles (keep only on lightbox)

**File**: `src/components/Gallery.jsx:238`

**Issue**: Every gallery tile has `layoutId` for shared-layout animation with the lightbox. On `visibleCount` change, all 28+ tiles re-measure. Shared-layout is great for the open transition, but the cost on every render is wasteful.

**Fix**:
- Keep `layoutId` only on the open/close pair.
- Use a simpler fade/scale for the tile → lightbox transition.

**Effort**: S | **Criticality**: Low (perf)

---

### 12. Add `loading="lazy"` and explicit `width`/`height` to `OurStory`, `AuthModal`, `ContactSlide` images

**Files**: `src/components/OurStory.jsx`, `src/components/AuthModal.jsx`, `src/components/ContactSlide.jsx`

**Issue**: Several images lack `loading="lazy"` and explicit dimensions, contributing to CLS.

**Fix**: Add attributes everywhere.

**Effort**: S | **Criticality**: Low

---

## P4 — SEO

### 13. Per-guest-slug sitemap entries

**File**: `public/sitemap.xml`

**Issue**: The sitemap only has the homepage. Each `/g/:slug` URL is a real, indexable page.

**Fix**:
- Generate the sitemap at build time from `src/data/guests.js` (or fetch from `api/content.js`).
- Include all guest slugs.

**Effort**: S | **Criticality**: Low

---

### 14. Dedicated OG image (1200×630)

**File**: `src/config.js`, `public/og-image.png`

**Issue**: The OG image is `/ar-logo.png` (184 KB PNG, square). Social previews look bad.

**Fix**:
- Design a 1200×630 OG image, save as `public/og-image.png`.
- Update `SEO.jsx` to point to it.

**Effort**: S (with image) | **Criticality**: Low

---

## P5 — Type safety

### 15. Migrate `src/components/AuthProvider.jsx` to TypeScript

**File**: `src/context/AuthProvider.jsx`

**Issue**: AuthProvider is the most security-sensitive file in the project (auth flows, guest lookup, PATCH triggers) and is the largest untyped `.jsx` file. A type error here has outsized consequences.

**Fix**:
- Rename to `.tsx`.
- Add types for `Guest`, `User`, `Content`, etc. in `src/types/`.
- Enable `checkJs: false` (already off) and `noUncheckedIndexedAccess: true` (just added).
- `tsc` will catch regressions.

**Effort**: M | **Criticality**: Medium (defense in depth)

---

## P6 — CI/CD

### 16. Add `CODEOWNERS` file

**File**: `.github/CODEOWNERS`

**Issue**: No automatic PR review routing.

**Fix**:
- Add `.github/CODEOWNERS` with the user as the default owner.

**Effort**: S | **Criticality**: Low

---

### 17. Move hardcoded PII out of CI workflow YAML

**Files**: `.github/workflows/test.yml`, `daily-report.yml`, `status-check.yml`

**Issue**: `sera.belize@gmail.com` is hardcoded in 3 workflow files. PII in git history is a minor concern.

**Fix**:
- Move to repo variables: `vars.NOTIFICATION_EMAIL` and reference as `${{ vars.NOTIFICATION_EMAIL }}`.
- Set the variable on the GitHub side.

**Effort**: S | **Criticality**: Low

---

## P7 — Nice to have

### 18. Offline-detection UI

**File**: `src/components/`, `src/main.jsx`

**Issue**: Service Worker caches the app shell, but the UI never tells the user they're offline.

**Fix**:
- Listen to `online`/`offline` events.
- Show a small toast "You're offline — showing cached content."

**Effort**: S | **Criticality**: Low

---

### 19. Retry mechanism for failed network operations

**Files**: `src/components/ContactForm.jsx`, `src/components/ContactSlide.jsx`

**Issue**: Failed save / failed contact send surfaces as an error message with no retry.

**Fix**:
- Add a "Retry" button next to the error.
- Use exponential backoff for transient errors.

**Effort**: S | **Criticality**: Low

---

### 20. `ErrorBoundary` as a functional component (drop the class)

**File**: `src/components/ErrorBoundary.jsx`

**Issue**: The only class component in the project. React 19 still supports it, but consistency wins.

**Fix**:
- Migrate to `react-error-boundary` (a small library) or use the new `use()` hook once stable.

**Effort**: S | **Criticality**: Low

---

## P8 — Cleanup

### 21. Reduce excessive `useCallback` / `useMemo` in `AuthModal.jsx`, `ContactForm.jsx`

**Files**: `src/components/AuthModal.jsx`, `src/components/ContactForm.jsx`

**Issue**: With React 19's compiler-friendly ergonomics, ~20+ memoization hooks wrap trivial operations.

**Fix**:
- Remove `useCallback` from handlers not passed to memoized children.
- Remove `useMemo` for cheap computations.
- The `eslint-disable react-hooks/preserve-manual-memoization` in `ContactForm.jsx:149` is an explicit smell.

**Effort**: M | **Criticality**: Low

---

### 22. Document the v1.x release process

**File**: `CHANGELOG.md` (per-release entry)

**Issue**: No convention for documenting fixes vs. features vs. chores in the changelog.

**Fix**:
- Adopt the Keep a Changelog categories: Added, Changed, Deprecated, Removed, Fixed, Security.
- Each v1.x release gets a new top-level section.

**Effort**: S | **Criticality**: Low

---

## Tracking

| ID | Title | Criticality | Effort | Milestone |
|---:|---|---|---|---|
| 1 | `guest/:id` PATCH authorization | High | M | v1.1 |
| 2 | Server-side email-OTP | High | L | v1.2 |
| 3 | Rate limiting | Medium | S-M | v1.1 |
| 4 | Sheets response cache | Medium | S | v1.1 |
| 5 | Sheet column map cache | Low | S | v1.1 |
| 6 | `motion.div` → `<button>` | Medium | M | v1.1 |
| 7 | Focus restoration on modal close | Medium | S | v1.1 |
| 8 | `jest-axe` a11y tests | Medium | M | v1.1 |
| 9 | Theme audit (hex → tokens) | Low | S | v1.1 |
| 10 | Self-host Google Fonts | Low | S | v1.2 |
| 11 | Drop `layoutId` from Gallery tiles | Low | S | v1.1 |
| 12 | `loading="lazy"` audit | Low | S | v1.1 |
| 13 | Per-guest sitemap entries | Low | S | v1.1 |
| 14 | Dedicated OG image | Low | S | v1.1 |
| 15 | `AuthProvider` → TypeScript | Medium | M | v1.2 |
| 16 | `CODEOWNERS` | Low | S | v1.1 |
| 17 | PII out of CI YAML | Low | S | v1.1 |
| 18 | Offline-detection UI | Low | S | v1.2 |
| 19 | Retry on network failure | Low | S | v1.1 |
| 20 | `ErrorBoundary` → functional | Low | S | v1.2 |
| 21 | Reduce `useCallback`/`useMemo` | Low | M | v1.2 |
| 22 | Changelog conventions | Low | S | v1.1 |
