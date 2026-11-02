import assert from 'node:assert/strict'
import { connectDB } from './db/index.js'
import { ensureSharedDemo } from './controllers/demo.controller.js'
import app from './app.js'

delete process.env.GEMINI_API_KEY
delete process.env.MONGODB_URI
await connectDB()
await ensureSharedDemo()
const server = app.listen(0)
const base = `http://127.0.0.1:${server.address().port}/api`

const call = async (method, path, token, body, query) => {
  const qs = query ? '?' + new URLSearchParams(query) : ''
  const res = await fetch(base + path + qs, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: method === 'GET' || method === 'PATCH' && body === undefined ? undefined : JSON.stringify(body || {}),
  })
  const text = await res.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = { raw: text } }
  return { status: res.status, body: parsed }
}

const patch = (path, token, body) => {
  return fetch(base + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body),
  }).then(async (res) => ({ status: res.status, body: await res.json() }))
}

try {
  const start = await call('POST', '/demo/start')
  assert.equal(start.status, 200)
  const tok = Object.fromEntries(start.body.users.map((u) => [u.role, u.token]))
  console.log('workspace', start.body.orgCode, 'OK')
  assert.equal((await call('GET', '/health')).body.ok, true)
  assert.equal((await call('GET', '/nope')).status, 404)

  const info = await call('GET', '/demo/info')
  assert.equal(info.status, 200)
  assert.equal(info.body.password, 'chai-tapri')
  const loginBad = await call('POST', '/demo/login', null, { username: 'meera', password: 'nope' })
  assert.equal(loginBad.status, 400)
  const loginOk = await call('POST', '/demo/login', null, { username: 'rahul', password: 'chai-tapri' })
  assert.equal(loginOk.status, 200)
  assert.equal(loginOk.body.orgCode, 'TAPRI-DEMO')
  const clickRole = await call('POST', '/demo/login', null, { role: 'manager' })
  assert.equal(clickRole.status, 200)

  assert.equal((await call('POST', '/brand/facts', tok.creator, { type: 'other', value: 'x' })).status, 403)
  assert.equal((await call('GET', '/brand')).status, 401)
  assert.equal((await call('POST', '/check', tok.creator, { text: '   ' })).status, 400)

  let r = await call('POST', '/check', tok.creator, { text: "Buy 1 Get 1 on ALL drinks, till 20 November. India's best chai!" })
  console.log('sample1', r.body.meta.source, r.body.findings.map((f) => `${f.status}:${f.ruleOrFactId}:${f.claim}->${f.suggestedFix}`))
  assert.equal(r.body.findings.length, 3)
  assert.ok(r.body.findings.every((f) => f.status !== 'supported'))
  assert.ok(r.body.findings.every((f) => f.ruleOrFactId))
  assert.ok(r.body.findings.every((f) => f.verified === true && f.suggestedFix))

  const snack = 'Cures diabetes naturally! Now 40% off all ragi snacks, free delivery today.'
  r = await call('POST', '/check', tok.creator, { text: snack })
  assert.equal(r.body.findings.length, 3)

  const findings = r.body.findings.map((f, i) => ({ ...f, decision: i === 0 ? 'accepted' : 'ignored' }))
  const sub = await call('POST', '/submissions', tok.creator, { title: 'Snack', originalText: snack, finalText: 'Made with ragi, no refined sugar! Now 40% off all ragi snacks, free delivery today.', findings, submit: true })
  assert.equal(sub.body.status, 'waiting_for_review')
  const id = sub.body._id

  const q = await call('GET', '/submissions', tok.reviewer, null, { queue: '1' })
  assert.ok(q.body.length >= 2)
  assert.equal((await call('POST', `/submissions/${id}/request-changes`, tok.reviewer, {})).status, 400)
  let rc = await call('POST', `/submissions/${id}/request-changes`, tok.reviewer, { comment: 'Remove delivery claim' })
  assert.equal(rc.body.status, 'changes_requested')
  rc = await call('POST', `/submissions/${id}/resubmit`, tok.creator, { text: 'Made with ragi, no refined sugar! 30% off.' })
  assert.equal(rc.body.status, 'waiting_for_review')
  rc = await call('POST', `/submissions/${id}/approve`, tok.reviewer)
  assert.equal(rc.body.status, 'approved')
  assert.equal(rc.body.versions.length, 3)
  const twice = await call('POST', `/submissions/${id}/approve`, tok.reviewer)
  assert.equal(twice.status, 200)
  assert.equal(twice.body.status, 'approved')

  const add = await call('POST', '/brand/rules', tok.manager, { text: 'Never say free', bannedWords: 'free, giveaway', severity: 'high', safeWording: 'Ask in store' })
  assert.equal(add.status, 200)
  r = await call('POST', '/check', tok.creator, { text: snack })
  assert.equal(r.body.meta.source, 'code-only')
  assert.ok(r.body.findings.some((f) => f.ruleOrFactId === 'R-15'))

  const f2 = await call('POST', '/brand/facts', tok.manager, { type: 'discount_percent', value: '25' })
  assert.equal(f2.body.added.id, 'F-05')

  const meshBefore = await call('GET', '/proofmesh', tok.manager, null, { factId: 'F-04' })
  assert.equal(meshBefore.status, 200)
  assert.ok(meshBefore.body.nodes.some((n) => n.kind === 'submission' && n.label === 'Instagram story'))

  const changed = await patch('/brand/facts/F-04', tok.manager, { value: '2026-11-21' })
  assert.equal(changed.status, 200)
  assert.ok(changed.body.impact.flagged.length >= 3)
  assert.ok(changed.body.impact.flagged.some((x) => x.title === 'Instagram story'))
  assert.ok(changed.body.impact.flagged.some((x) => x.status === 'needs_rereview'))

  const meshAfter = await call('GET', '/proofmesh', tok.manager, null, { factId: 'F-04' })
  assert.ok(meshAfter.body.flaggedCount >= 3)

  const insights = await call('GET', '/insights', tok.manager)
  assert.equal(insights.status, 200)
  const r12 = insights.body.rows.find((row) => row.id === 'R-12')
  assert.ok(r12)
  assert.ok(r12.ignored >= 1)
  assert.ok(r12.flagged >= r12.ignored)

  const other = await call('POST', '/demo/start')
  const otherTok = Object.fromEntries(other.body.users.map((u) => [u.role, u.token]))
  assert.equal((await call('GET', `/submissions/${id}`, otherTok.reviewer)).status, 404)

  console.log('ALL SMOKE TESTS PASSED')
} finally {
  server.close()
}
