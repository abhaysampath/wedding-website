# Security Policy

## Supported versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

The current `main` branch is **Version 1 (v1)**. All v1.0.x patches are eligible for security fixes.

## Reporting a vulnerability

**Please do not file public GitHub issues for security vulnerabilities.**

Report privately to **sera.belize@gmail.com** with:
1. A clear description of the issue
2. Steps to reproduce
3. The potential impact (e.g. data exposure, auth bypass, RCE)
4. Any suggested fix (optional)

You should receive an initial response within **7 days**.

## Scope

The following are in scope for security reports:

- Authentication / authorization flaws in the wedding site (sign-in bypass, role escalation, guest-data tampering)
- Cross-site scripting (XSS), HTML injection, or template injection in the SPA or in alert/contact emails
- Cross-site request forgery (CSRF) on `/api/*` endpoints
- Server-side request forgery (SSRF) in the Vercel serverless functions
- Information disclosure (PII leaks, leaked secrets, verbose error messages)
- Origin-check bypasses
- Service Worker poisoning (cache poisoning of `/api/*` or cross-origin responses)
- Dependency CVEs that affect the production bundle
- Content-Security-Policy bypasses

Out of scope:
- Denial of service / volumetric attacks (handled at Vercel edge)
- Social engineering
- Issues in third-party services (Firebase, EmailJS, Resend, Google Sheets) — report upstream

## Acknowledgement process

1. We confirm receipt within 7 days.
2. We triage and assign a severity (Critical / High / Medium / Low).
3. We develop and test a fix on a private branch.
4. We ship the fix in a v1.0.x patch release and credit the reporter (if desired).
5. We publish a brief post-mortem in `CHANGELOG.md`.

## Hardening checklist (v1.0)

The v1.0 benchmark enforced:

- [x] All `/api/*` endpoints check `Origin` against an exact-match allowlist
- [x] All HTML interpolation in emails is escaped at the boundary
- [x] No secrets in source code or git history
- [x] No PII in `public/` (guests-backup moved to `.backups/`, gitignored)
- [x] State-changing endpoints reject non-conforming HTTP methods
- [x] Service Worker never caches `/api/*` or cross-origin responses
- [x] CSP, HSTS, Permissions-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy in `vercel.json`
- [x] `package-lock.json` is committed and CI uses `npm ci`
- [x] GitHub Actions actions are pinned to major versions
- [x] All `npm audit` advisories resolved (0 vulnerabilities at v1.0)

## Key contacts

- **Security contact**: sera.belize@gmail.com
- **Production URL**: https://abhayandrebecca.com
- **Hosting**: Vercel (https://vercel.com)
