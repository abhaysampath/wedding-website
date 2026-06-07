import { createServer } from 'http'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const PORT = process.env.API_PORT || 3001

const routes = {
  '/api/content': 'api/content.js',
  '/api/contact': 'api/contact.js',
}
const guestRe = /^\/api\/guest\/(\w+)$/

function compat(req, res) {
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
  return { req, res }
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.end()

  try {
    if (req.url === '/api/content') {
      const handler = (await import(resolve(root, routes[req.url]))).default
      await handler(req, compat(req, res).res)
    } else if (guestRe.test(req.url)) {
      const handler = (await import(resolve(root, 'api/guest/[id].js'))).default
      const parts = []
      for await (const chunk of req) parts.push(chunk)
      req.body = Buffer.concat(parts).toString()
      await handler(req, compat(req, res).res)
    } else {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  } catch (err) {
    console.error('API error:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ error: err.message }))
  }
})

server.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`))
