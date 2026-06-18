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
      console.error(
        'Sheet write failed:',
        guestId,
        data,
        res.status,
        await res.text().catch(() => ''),
      )
      return false
    }
    const body = await res.json()
    if (!body.updated) console.warn('Sheet write returned 0 updates:', guestId, data)
    return body.updated > 0
  } catch (err) {
    console.error('Sheet write error:', guestId, data, err)
    return false
  }
}

export async function mintServerSession(guestId) {
  if (!guestId) return false
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId }),
    })
    return res.ok
  } catch (err) {
    console.error('mintServerSession failed:', guestId, err)
    return false
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
