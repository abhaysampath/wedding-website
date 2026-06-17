# AGENTS.md

> Instructions for AI coding agents (and humans) working on this repository.

## Project overview

Wedding website for Rebecca and Abhay — two ceremonies (US: Stone Mill at NY Botanical Garden, May 30 2027; India: Dwaraka Palace Chennai, Feb 25 2027). Role-based visibility, RSVP, contact form, FAQ, gallery, travel info. Stack: React 19 + Vite 8 + Tailwind v4 + framer-motion. Backend: Vercel serverless functions talking to Google Sheets + Firebase Auth + EmailJS + Resend.

**Production**: https://abhayandrebecca.com

## Versioning

- The current `main` branch is **Version 1 (v1)** — the official, stable, publicly-visible production state.
- All changes go on a **feature branch** (e.g. `v1.x`, `feat/...`, `fix/...`) and are merged to `main` only after the user has tested and confirmed.

## Build / verify commands

Always run before declaring work done:

```bash
npm run lint          # ESLint (0 errors required)
npm run format:check  # Prettier (all files clean)
npm run typecheck     # tsc (no errors)
npm test              # vitest (219 tests in 25 files, must all pass)
npm run build         # vite build (produces dist/)
```

Run them in this order. If any fails, fix it before committing.

## Code conventions

- **No new dependencies** without explicit user approval. The current tree is intentional.
- **No `forwardRef`** (deprecated in React 19). Pass `ref` as a prop.
- **No `dangerouslySetInnerHTML`** anywhere — if you need HTML, escape user input at the boundary.
- **No template-literal HTML** for user-controlled content. Always escape with `escape-html` or a local `escapeHtml()` helper.
- **No `setState` inside `useEffect`** unless wrapped in `setTimeout(fn, 0)` (React 19 compliance). Better: use `useState` initializer or `useReducer`.
- **Every effect has a dep array.** No naked `useEffect(fn)`.
- **rAF-throttle scroll handlers.** Direct `setState` in a scroll listener causes main-thread thrash.
- **Tailwind tokens only** for colors and fonts. Do not inline hex/rgb. If you need a new color, add it to the `@theme` block in `src/index.css`.
- **Secrets in env, not in code.** `.env` is gitignored. Never commit credentials, even temporarily.
- **No placeholder text in shipped JSON-LD / config.** If you find `"123 Wedding Lane"` or `"example.com"`, treat it as a bug.
- **Conventional commits** for messages: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`.

## Security rules (hard requirements)

1. **API endpoints check `Origin`** via `api/_origin.js`. Do not bypass.
2. **Origin allowlist uses exact equality**, not `startsWith`. Prefix matching is a known bypass pattern.
3. **All user input is HTML-escaped** before being interpolated into HTML strings (emails, templates, etc.).
4. **No PII in `public/`.** Files in `public/` are served by Vercel's CDN. The daily report's guest backup is now written to `.backups/` (gitignored, not deployed).
5. **State-changing methods** (`POST`, `PATCH`, `PUT`, `DELETE`) on `api/*` handlers must reject other methods with 405.
6. **No client-side trust of `uid` / `email` / `phone` for authorization.** The `/api/guest/:id` PATCH endpoint should validate against an auth token, not just `Origin`.
7. **Service Worker never caches `/api/*` or cross-origin requests.**

## Common tasks

### Add a new env var
1. Add to `.env.example` with a comment block.
2. Add to `scripts/verify-env.mjs` under `OPTIONAL_VARS` (or `REQUIRED_VARS` if it's required).
3. Add to `.github/workflows/test.yml` `env:` block.
4. Add to the user's GitHub repo secrets (manually — agents can't do this).
5. Add to Vercel project env vars (manually).

### Add a new component
- Place in `src/components/`
- Co-locate tests: `ComponentName.test.jsx`
- Use Tailwind tokens; respect `prefers-reduced-motion` via `MotionConfig reducedMotion="user"` (already set in `App.jsx`)
- Add `aria-label` to any icon-only button
- Add an `ErrorBoundary` if it can throw (per-section boundaries are already wired)

### Modify the schema.org JSON-LD
- Edit `src/data/wedding-jsonld.js`
- Validate against https://validator.schema.org/
- The wedding date and venue come from `src/data/weddings.json` (do not duplicate)

## File map (where things live)

| Concern | Location |
|---|---|
| Auth provider / context | `src/context/AuthProvider.jsx`, `src/context/AuthContext.js` |
| Firebase init | `src/firebase.js` |
| Email verification | `src/utils/verifyEmail.js` |
| RSVP / contact | `src/components/ContactForm.jsx`, `src/components/ContactSlide.jsx` |
| Auth modal | `src/components/AuthModal.jsx` |
| Hero carousel | `src/components/Hero.jsx` |
| Gallery + lightbox | `src/components/Gallery.jsx` |
| Serverless functions | `api/` (content, contact, alert-error, guest/[id], sheets-config, _origin) |
| Google Sheets client | `api/sheets-config.js`, used by `api/content.js` + `api/guest/[id].js` |
| Wedding/event data | `src/data/weddings.json` |
| Fallback guest list | `src/data/guests.js` |
| Theme tokens | `src/index.css` (`@theme` block) |
| Service worker | `public/sw.js` (rebuilt with version in `dist/sw.js`) |
| CI/CD | `.github/workflows/*.yml` |
| Ops scripts | `scripts/*.mjs` |
| Env validation | `scripts/verify-env.mjs`, `scripts/verify-build.mjs` |

## Don't do

- Don't push to `main` without user confirmation.
- Don't merge PRs yourself — the user reviews.
- Don't add tracking pixels, analytics, or third-party scripts without asking.
- Don't use `dangerouslySetInnerHTML`.
- Don't commit `.env` or any file containing real keys.
- Don't use `startsWith` for origin checks.
- Don't suppress ESLint errors with `// eslint-disable` without a comment explaining why.
- Don't add `setTimeout(fn, 0)` to silence React 19 warnings — refactor to derived state.
- Don't use `import * as` — always use named imports.

## See also

- `README.md` — high-level overview, scripts, services
- `CONFIG.md` — `src/config.js` reference
- `docs/ci-cd-setup.md` — pipeline details
- `docs/test-account.md` — test credentials
- `docs/v1-suggestions.md` — queued v1.x improvements
- `CHANGELOG.md` — release history
- `SECURITY.md` — disclosure policy
