// Run with: npm test   (in-memory storage, no keys needed). Starts the real Express app on a random port.
import assert from 'node:assert/strict'
import { connectDB } from './db/index.js'
import app from './app.js'

delete process.env.GEMINI_API_KEY
delete process.env.MONGODB_URI
await connectDB()
const server = app.listen(0)
const base = `http://127.0.0.1:${server.address().port}/api`

const call = async (method, path, token, body, query) => {
  const qs = query ? '?' + new URLSearchParams(query) : ''
  const res = await fetch(base + path + qs, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  })
  return { status: res.status, body: await res.json() }
}

try {
  const start = await call('POST', '/demo/start')
  assert.equal(start.status, 200)
  const tok = Object.fromEntries(start.body.users.map((u) => [u.role, u.token]))
  console.log('workspace', start.body.orgCode, 'OK')
  assert.equal((await call('GET', '/health')).body.ok, true)
  assert.equal((await call('GET', '/nope')).status, 404)

  // role protection
  assert.equal((await call('POST', '/brand/facts', tok.creator, { type: 'other', value: 'x' })).status, 403)
  assert.equal((await call('GET', '/brand')).status, 401)

  // sample 1
  let r = await call('POST', '/check', tok.creator, { text: "Buy 1 Get 1 on ALL drinks, till 20 November. India's best chai!" })
  console.log('sample1', r.body.meta.source, r.body.findings.map((f) => `${f.status}:${f.ruleOrFactId}:${f.claim}->${f.suggestedFix}`))
  assert.equal(r.body.findings.length, 3)
  assert.ok(r.body.findings.every((f) => f.status !== 'supported'))
  assert.ok(r.body.findings.every((f) => f.ruleOrFactId)) // IDs saved on every finding (needed for ProofMesh)

  // sample 2
  const snack = 'Cures diabetes naturally! Now 40% off all ragi snacks, free delivery today.'
  r = await call('POST', '/check', tok.creator, { text: snack })
  assert.equal(r.body.findings.length, 3)

  // create + submit
  const findings = r.body.findings.map((f, i) => ({ ...f, decision: i === 0 ? 'accepted' : 'ignored' }))
  const sub = await call('POST', '/submissions', tok.creator, { title: 'Snack', originalText: snack, finalText: 'Made with ragi, no refined sugar! Now 40% off all ragi snacks, free delivery today.', findings, submit: true })
  assert.equal(sub.body.status, 'waiting_for_review')
  const id = sub.body._id

  // review flow
  const q = await call('GET', '/submissions', tok.reviewer, null, { status: 'waiting_for_review' })
  assert.equal(q.body.length, 2)
  assert.equal((await call('POST', `/submissions/${id}/request-changes`, tok.reviewer, {})).status, 400)
  let rc = await call('POST', `/submissions/${id}/request-changes`, tok.reviewer, { comment: 'Remove delivery claim' })
  assert.equal(rc.body.status, 'changes_requested')
  rc = await call('POST', `/submissions/${id}/resubmit`, tok.creator, { text: 'Made with ragi, no refined sugar! 30% off.' })
  assert.equal(rc.body.status, 'waiting_for_review')
  rc = await call('POST', `/submissions/${id}/approve`, tok.reviewer)
  assert.equal(rc.body.status, 'approved')
  assert.equal(rc.body.versions.length, 3)

  // manager adds a rule -> checked live by code
  const add = await call('POST', '/brand/rules', tok.manager, { text: 'Never say free', bannedWords: 'free, giveaway', severity: 'high' })
  assert.equal(add.status, 200)
  r = await call('POST', '/check', tok.creator, { text: snack })
  assert.equal(r.body.meta.source, 'code-only')
  assert.ok(r.body.findings.some((f) => f.ruleOrFactId === 'R-15'))

  // fact variants
  const f2 = await call('POST', '/brand/facts', tok.manager, { type: 'discount_percent', value: '25' })
  assert.equal(f2.body.added.id, 'F-05')

  // cross-workspace isolation
  const other = await call('POST', '/demo/start')
  const otherTok = Object.fromEntries(other.body.users.map((u) => [u.role, u.token]))
  assert.equal((await call('GET', `/submissions/${id}`, otherTok.reviewer)).status, 404)

  console.log('ALL SMOKE TESTS PASSED')
} finally {
  server.close()
}
