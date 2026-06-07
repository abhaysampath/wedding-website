/**
 * Vercel Ignored Build Step
 *
 * Skips auto-build on main branch (CI handles production deploys).
 * Builds preview deployments for all other branches/PRs.
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

if (branch === 'main') {
  console.log(`⏭️  Skipping auto-build on main — CI handles production deploys`)
  process.exit(0) // skip
}

console.log(`🔨 Building preview deployment for branch: ${branch}`)
process.exit(1) // build