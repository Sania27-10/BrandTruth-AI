const BASE = (import.meta.env.VITE_API_URL || '') + '/api'

async function request(method, path, token, body, onExpired) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined && method !== 'GET' ? JSON.stringify(body) : undefined,
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
  if (res.status === 409) throw new Error((data && data.error) || 'This was updated elsewhere. Refresh and try again.')
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`)
    err.code = data && data.code
    err.status = res.status
    throw err
  }
  return data
}

export const startDemo = () => request('POST', '/demo/start', null, {})
export const demoInfo = () => request('GET', '/demo/info', null)
export const loginDemo = (body) => request('POST', '/demo/login', null, body)

export function makeApi(token, onExpired) {
  const r = (m, p, b) => request(m, p, token, b, onExpired)
  return {
    getBrand: () => r('GET', '/brand'),
    addFact: (fact) => r('POST', '/brand/facts', fact),
    previewFact: (id, body) => r('POST', `/brand/facts/${id}/preview`, body || {}),
    updateFact: (id, fact) => r('PATCH', `/brand/facts/${id}`, fact),
    addRule: (rule) => r('POST', '/brand/rules', rule),
    updateRule: (id, rule) => r('PATCH', `/brand/rules/${id}`, rule),
    getAsset: (id) => r('GET', `/brand/assets/${id}`),
    updateAsset: (id, body) => r('PATCH', `/brand/assets/${id}`, body),
    reverifyAsset: (id) => r('POST', `/brand/assets/${id}/reverify`, {}),
    runCheck: (text) => r('POST', '/check', { text }),
    extractText: (image, mime) => r('POST', '/extract', { image, mime }),
    createSubmission: (data) => r('POST', '/submissions', data),
    listSubmissions: (status) => r('GET', '/submissions' + (status ? `?status=${encodeURIComponent(status)}` : '')),
    listQueue: () => r('GET', '/submissions?queue=1'),
    getSubmission: (id) => r('GET', `/submissions/${id}`),
    submitForReview: (id) => r('POST', `/submissions/${id}/submit`, {}),
    resubmit: (id, text, baseUpdatedAt) => r('POST', `/submissions/${id}/resubmit`, { text, baseUpdatedAt }),
    addComment: (id, text) => r('POST', `/submissions/${id}/comments`, { text }),
    approve: (id, acknowledge) => r('POST', `/submissions/${id}/approve`, { acknowledge: !!acknowledge }),
    requestChanges: (id, comment) => r('POST', `/submissions/${id}/request-changes`, { comment }),
    reverify: (id) => r('POST', `/submissions/${id}/reverify`, {}),
    markUpdated: (id) => r('POST', `/submissions/${id}/mark-updated`, {}),
    getProofMesh: (factId) => r('GET', '/proofmesh' + (factId ? `?factId=${encodeURIComponent(factId)}` : '')),
    getInsights: (query) => r('GET', '/insights' + (query ? '?' + new URLSearchParams(query).toString() : '')),
    listNotifications: () => r('GET', '/notifications'),
    readNotification: (id) => r('POST', `/notifications/${id}/read`, {}),
    readAllNotifications: () => r('POST', '/notifications/read-all', {}),
  }
}
