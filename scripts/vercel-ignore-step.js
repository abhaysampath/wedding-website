/**
 * Vercel Ignored Build Step
 *
 * Always builds. Previously this script returned exit 0 on `main` because
 * CI's Vercel CLI step was responsible for the production deploy. As of
 * 2026-06-26, CI no longer calls the CLI (it hangs on the Hobby plan after
 * the deploy succeeds) and instead polls Vercel's API for the auto-deploy.
 * Vercel must therefore be allowed to build on every push.
 *
 * Exits 1 (build) unconditionally. The script is kept in case we later
 * want to add logic here (e.g. skip docs-only commits via [skip ci] tags).
 *
 * Usage in Vercel dashboard:
 *   Settings → Git → Ignored Build Step → "Run my Bash/Node script"
 *   Command: node scripts/vercel-ignore-step.js
 *
 * Exit codes:
 *   0 → skip build (don't deploy)
 *   1 → build (deploy normally)
 */

const branch = process.env.VERCEL_GIT_COMMIT_REF || ''
console.log(`🔨 Building deployment for branch: ${branch || '(none)'}`)
process.exit(1)
