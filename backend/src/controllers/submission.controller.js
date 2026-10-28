import * as db from '../db/index.js'
import { ROLES, STATUS, MAX_TEXT } from '../constants.js'
import { badRequest, ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { makeSubmission, historyEntry, summary, cleanFindings, label, now } from '../models/submission.model.js'

async function loadSubmission(user, id) {
  const s = await db.get('submissions', id)
  if (!s || s.orgCode !== user.orgCode) throw new ApiError(404, 'Submission not found.')
  return s
}

const touch = (s) => { s.updatedAt = now() }

// POST /api/submissions  (creator)
export const createSubmission = asyncHandler(async (req, res) => {
  const { user, body } = { user: req.user, body: req.body || {} }
  const originalText = String(body.originalText || '').trim()
  const finalText = String(body.finalText || originalText).trim()
  if (!originalText) throw badRequest('There is no text to save.')
  if (originalText.length > MAX_TEXT || finalText.length > MAX_TEXT) throw badRequest(`Please keep the text under ${MAX_TEXT} characters.`)
  const title = String(body.title || 'Untitled poster').trim().slice(0, 80) || 'Untitled poster'
  const findings = cleanFindings(body.findings)
  const submit = !!body.submit
  const t = now()
  const versions = [{ no: 1, text: originalText, by: label(user), at: t }]
  if (finalText !== originalText) versions.push({ no: 2, text: finalText, by: label(user), at: t })
  const ignored = findings.filter((f) => f.decision === 'ignored').length
  const history = [historyEntry(user, 'created', 'Checked against brand rules')]
  if (submit) {
    history.push(historyEntry(user, 'submitted', `Submitted for review${ignored ? ` (${ignored} finding${ignored > 1 ? 's' : ''} ignored)` : ''}`))
  }
  const doc = await db.insert('submissions', makeSubmission({
    orgCode: user.orgCode, title, creator: user.name,
    status: submit ? STATUS.WAITING : STATUS.DRAFT,
    versions, findings, history,
  }))
  res.json(doc)
})

// GET /api/submissions?status=...
export const listSubmissions = asyncHandler(async (req, res) => {
  let list = await db.find('submissions', { orgCode: req.user.orgCode })
  if (req.user.role === ROLES.CREATOR) list = list.filter((s) => s.creator === req.user.name)
  if (req.query.status) list = list.filter((s) => s.status === req.query.status)
  res.json(list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).map(summary))
})

// GET /api/submissions/:id
export const getSubmission = asyncHandler(async (req, res) => {
  res.json(await loadSubmission(req.user, req.params.id))
})

// POST /api/submissions/:id/submit  (creator)
export const submitForReview = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  if (![STATUS.DRAFT, STATUS.CHANGES].includes(s.status)) throw badRequest('This submission is not a draft.')
  s.status = STATUS.WAITING
  touch(s)
  s.history.push(historyEntry(req.user, 'submitted', 'Submitted for review'))
  await db.save('submissions', s)
  res.json(s)
})

// POST /api/submissions/:id/resubmit  (creator)
export const resubmit = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  if (s.status !== STATUS.CHANGES) throw badRequest('Changes were not requested on this submission.')
  const text = String(req.body?.text || '').trim()
  if (!text) throw badRequest('Text cannot be empty.')
  if (text.length > MAX_TEXT) throw badRequest(`Please keep the text under ${MAX_TEXT} characters.`)
  s.versions.push({ no: s.versions.length + 1, text, by: label(req.user), at: now() })
  s.status = STATUS.WAITING
  touch(s)
  s.history.push(historyEntry(req.user, 'resubmitted', `Version ${s.versions.length} submitted for review`))
  await db.save('submissions', s)
  res.json(s)
})

// POST /api/submissions/:id/comments  (any role)
export const addComment = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  const text = String(req.body?.text || '').trim().slice(0, 500)
  if (!text) throw badRequest('Write a comment first.')
  s.comments.push({ by: label(req.user), text, at: now() })
  touch(s)
  await db.save('submissions', s)
  res.json(s)
})

// POST /api/submissions/:id/approve  (reviewer)
export const approve = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  if (s.status !== STATUS.WAITING) throw badRequest('Only submissions waiting for review can be approved.')
  s.status = STATUS.APPROVED
  touch(s)
  s.history.push(historyEntry(req.user, 'approved', 'Approved for publication'))
  await db.save('submissions', s)
  res.json(s)
})

// POST /api/submissions/:id/request-changes  (reviewer)
export const requestChanges = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  if (s.status !== STATUS.WAITING) throw badRequest('Only submissions waiting for review can be sent back.')
  const comment = String(req.body?.comment || '').trim().slice(0, 500)
  if (!comment) throw badRequest('Please add a comment explaining what to change.')
  s.status = STATUS.CHANGES
  touch(s)
  s.comments.push({ by: label(req.user), text: comment, at: s.updatedAt })
  s.history.push(historyEntry(req.user, 'changes_requested', 'Changes requested'))
  await db.save('submissions', s)
  res.json(s)
})
