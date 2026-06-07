export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY
  if (!RECAPTCHA_SECRET) {
    return res.status(503).json({ error: 'reCAPTCHA not configured' })
  }

  const { token } = req.body || {}
  if (!token) {
    return res.status(400).json({ error: 'Missing reCAPTCHA token' })
  }

  try {
    const verify = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
    })
    const data = await verify.json()

    if (data.success && data.score >= 0.5) {
      return res.status(200).json({ success: true, score: data.score })
    }
    return res.status(400).json({ success: false, score: data.score || 0, error: 'reCAPTCHA verification failed' })
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
