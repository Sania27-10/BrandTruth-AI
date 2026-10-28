// Every call to the backend goes through this file.
// Empty in dev (Vite proxy forwards /api) and when the backend serves the frontend.
const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

async function request(method, path, token, body, onExpired) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.')
  }
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  if (res.status === 401 && token) {
    onExpired && onExpired()
    throw new Error('Your demo session expired. Please start a new demo.')
  }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`)
  return data
}

export const startDemo = () => request('POST', '/demo/start', null, {})

export function makeApi(token, onExpired) {
  const r = (m, p, b) => request(m, p, token, b, onExpired)
  return {
    getBrand: () => r('GET', '/brand'),
    addFact: (fact) => r('POST', '/brand/facts', fact),
    addRule: (rule) => r('POST', '/brand/rules', rule),
    runCheck: (text) => r('POST', '/check', { text }),
    extractText: (image, mime) => r('POST', '/extract', { image, mime }),
    createSubmission: (data) => r('POST', '/submissions', data),
    listSubmissions: (status) => r('GET', '/submissions' + (status ? `?status=${status}` : '')),
    getSubmission: (id) => r('GET', `/submissions/${id}`),
    submitForReview: (id) => r('POST', `/submissions/${id}/submit`, {}),
    resubmit: (id, text) => r('POST', `/submissions/${id}/resubmit`, { text }),
    addComment: (id, text) => r('POST', `/submissions/${id}/comments`, { text }),
    approve: (id) => r('POST', `/submissions/${id}/approve`, {}),
    requestChanges: (id, comment) => r('POST', `/submissions/${id}/request-changes`, { comment }),
  }
}
