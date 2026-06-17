const ALLOWED_ORIGINS = [
  'https://abhayandrebecca.com',
  'https://www.abhayandrebecca.com',
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
].filter(Boolean)

export function isAllowedOrigin(req) {
  const origin = req.headers.origin || req.headers.referer || ''
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))
}
