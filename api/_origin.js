const PROD_ORIGINS = ['https://abhayandrebecca.com', 'https://www.abhayandrebecca.com']
const LOCAL_ORIGINS = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']
const VERCEL_PREVIEW_ORIGINS = [
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
].filter(Boolean)

const VERCEL_ENV = process.env.VERCEL_ENV
const ALLOWED_ORIGINS = [
  ...PROD_ORIGINS,
  ...LOCAL_ORIGINS,
  ...VERCEL_PREVIEW_ORIGINS,
].filter(Boolean)

export function isAllowedOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || ''
  if (!origin) return false

  if (VERCEL_ENV === 'production') {
    return PROD_ORIGINS.includes(origin)
  }

  if (origin.endsWith('.vercel.app') || origin === 'https://vercel.com') {
    return true
  }

  return ALLOWED_ORIGINS.includes(origin)
}
