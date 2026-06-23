import { getIdToken } from '../firebase'

export async function writeToSheet(guestId, data) {
  if (!guestId) return true
  try {
    const headers = { 'Content-Type': 'application/json' }
    const token = await getIdToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`/api/guest/${guestId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers,
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      if (res.status === 401) {
        await clearServerSession()
      }
      if (res.status === 503) {
        console.warn(
          'Sheet write returned 503 (server auth not configured for this method). Skipping — user is still signed in locally.',
          guestId,
          errBody,
        )
        return true
      }
      const err = new Error(errBody.error || `Sheet write failed (${res.status})`)
      err.status = res.status
      err.body = errBody
      console.error('Sheet write failed:', guestId, res.status, errBody)
      throw err
    }
    const body = await res.json()
    if (!body.updated) {
      console.warn('Sheet write returned 0 updates:', guestId, data)
    }
    return body.updated > 0
  } catch (err) {
    if (err.status) throw err
    console.error('Sheet write error:', guestId, data, err)
    throw err
  }
}

export async function mintServerSession(guestId) {
  if (!guestId) return { ok: false, status: 0, error: 'No guestId' }
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('mintServerSession failed:', guestId, res.status, body)
      return { ok: false, status: res.status, error: body.error }
    }
    return { ok: true, ...body }
  } catch (err) {
    console.error('mintServerSession error:', guestId, err)
    return { ok: false, status: 0, error: err.message }
  }
}

export async function clearServerSession() {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    })
  } catch (err) {
    console.warn('clearServerSession failed:', err)
  }
}
