import * as db from '../db/index.js'
import { ROLES, STATUS, MAX_TEXT } from '../constants.js'
import { badRequest, ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { makeSubmission, historyEntry, summary, cleanFindings, label, now, latestText, mergeFindings } from '../models/submission.model.js'
import { checkSync } from '../utils/checker.js'
import { loadBrand } from './brand.controller.js'
import { notifyRoles } from '../utils/notify.js'

async function loadSubmission(user, id) {
  const s = await db.get('submissions', id)
  if (!s || s.orgCode !== user.orgCode) throw new ApiError(404, 'Submission not found.')
  return s
}

const touch = (s) => { s.updatedAt = now() }

function unresolved(s) {
  return (s.findings || []).filter((f) => f.status !== 'supported' && f.decision !== 'accepted')
}

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
    assetId: body.assetId ? String(body.assetId).slice(0, 12) : null,
    channel: body.channel ? String(body.channel).slice(0, 40) : null,
  }))
  if (submit) {
    await notifyRoles(user.orgCode, [ROLES.REVIEWER], {
      event: 'submitted',
      title: 'New submission waiting',
      body: `${title} is in the review queue.`,
      href: '/submission/' + doc._id,
    })
  }
  res.json(doc)
})

export const listSubmissions = asyncHandler(async (req, res) => {
  let list = await db.find('submissions', { orgCode: req.user.orgCode })
  if (req.user.role === ROLES.CREATOR) list = list.filter((s) => s.creator === req.user.name)
  if (req.query.queue === '1') list = list.filter((s) => s.status === STATUS.WAITING || s.status === STATUS.REREVIEW)
  else if (req.query.status) list = list.filter((s) => s.status === req.query.status)
  res.json(list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).map(summary))
})

export const getSubmission = asyncHandler(async (req, res) => {
  res.json(await loadSubmission(req.user, req.params.id))
})

export const submitForReview = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  if (s.status === STATUS.WAITING) return res.json(s)
  if (![STATUS.DRAFT, STATUS.CHANGES, STATUS.REREVIEW].includes(s.status)) throw badRequest('This submission is not a draft.')
  s.status = s.stale ? STATUS.REREVIEW : STATUS.WAITING
  touch(s)
  s.history.push(historyEntry(req.user, 'submitted', 'Submitted for review'))
  await db.save('submissions', s)
  await notifyRoles(req.user.orgCode, [ROLES.REVIEWER], {
    event: 'submitted',
    title: 'New submission waiting',
    body: `${s.title} is in the review queue.`,
    href: '/submission/' + s._id,
  })
  res.json(s)
})

export const resubmit = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  if (![STATUS.CHANGES, STATUS.REREVIEW].includes(s.status)) throw badRequest('This submission is not waiting for an edit.')
  const text = String(req.body?.text || '').trim()
  if (!text) throw badRequest('Text cannot be empty.')
  if (text.length > MAX_TEXT) throw badRequest(`Please keep the text under ${MAX_TEXT} characters.`)
  if (s.updatedAt && req.body?.baseUpdatedAt && req.body.baseUpdatedAt !== s.updatedAt) {
    throw new ApiError(409, 'This submission changed in another tab. Refresh and try again.')
  }
  const brand = await loadBrand(req.user)
  const fresh = checkSync(text, brand)
  s.findings = mergeFindings(s.findings, fresh)
  s.versions.push({ no: s.versions.length + 1, text, by: label(req.user), at: now() })
  s.stale = (s.findings || []).some((f) => f.stale)
  s.contentUpdatedAfterImpact = true
  s.status = s.stale ? STATUS.REREVIEW : STATUS.WAITING
  touch(s)
  s.history.push(historyEntry(req.user, 'resubmitted', `Version ${s.versions.length} submitted for review`))
  s.verificationRuns = s.verificationRuns || []
  s.verificationRuns.push({ at: s.updatedAt, by: label(req.user), brandVersion: brand.version, findingCount: s.findings.length })
  await db.save('submissions', s)
  await notifyRoles(req.user.orgCode, [ROLES.REVIEWER], {
    event: 'submitted',
    title: 'Resubmitted for review',
    body: `${s.title} v${s.versions.length} is waiting.`,
    href: '/submission/' + s._id,
  })
  res.json(s)
})

export const addComment = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  const text = String(req.body?.text || '').trim().slice(0, 500)
  if (!text) throw badRequest('Write a comment first.')
  s.comments.push({ by: label(req.user), text, at: now() })
  touch(s)
  await db.save('submissions', s)
  res.json(s)
})

export const approve = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  if (s.status === STATUS.APPROVED) return res.json(s)
  if (s.status !== STATUS.WAITING && s.status !== STATUS.REREVIEW) throw badRequest('Only submissions waiting for review can be approved.')
  const open = unresolved(s)
  const ignored = (s.findings || []).filter((f) => f.decision === 'ignored')
  const stale = (s.findings || []).some((f) => f.stale) || s.stale
  const needsAck = open.length > 0 || stale
  const ack = req.body?.acknowledge === true || req.body?.acknowledge === 'true' || req.body?.approveAnyway === true
  if (needsAck && !ack) {
    throw badRequest(
      `This still has ${ignored.length} ignored finding${ignored.length === 1 ? '' : 's'}${stale ? ' and stale checks' : ''}. Tick the confirmation box, then click Approve anyway.`,
      'ACK_REQUIRED',
    )
  }
  s.status = STATUS.APPROVED
  s.approvedBy = label(req.user)
  s.approvedAt = now()
  s.approvedAnyway = !!needsAck
  s.approvalAck = !!ack
  touch(s)
  s.history.push(historyEntry(req.user, 'approved', needsAck
    ? `Approved anyway (${ignored.length} ignored, ${open.length} still open${stale ? ', stale checks present' : ''})`
    : 'Approved for publication'))
  await db.save('submissions', s)
  await notifyRoles(req.user.orgCode, [ROLES.CREATOR], {
    event: 'approved',
    title: 'Submission approved',
    body: `${s.title} was approved.`,
    href: '/submission/' + s._id,
  })
  res.json(s)
})

export const requestChanges = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  if (s.status === STATUS.CHANGES) return res.json(s)
  if (s.status !== STATUS.WAITING && s.status !== STATUS.REREVIEW) throw badRequest('Only submissions waiting for review can be sent back.')
  const comment = String(req.body?.comment || '').trim().slice(0, 500)
  if (!comment) throw badRequest('Please add a comment explaining what to change.')
  s.status = STATUS.CHANGES
  touch(s)
  s.comments.push({ by: label(req.user), text: comment, at: s.updatedAt })
  s.history.push(historyEntry(req.user, 'changes_requested', 'Changes requested'))
  await db.save('submissions', s)
  await notifyRoles(req.user.orgCode, [ROLES.CREATOR], {
    event: 'changes_requested',
    title: 'Changes requested',
    body: `${s.title}: ${comment}`,
    href: '/submission/' + s._id,
  })
  res.json(s)
})

export const reverify = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  const brand = await loadBrand(req.user)
  const text = latestText(s)
  const fresh = checkSync(text, brand)
  s.findings = mergeFindings(s.findings, fresh)
  s.stale = (s.findings || []).some((f) => f.stale)
  s.verificationRuns = s.verificationRuns || []
  s.verificationRuns.push({ at: now(), by: label(req.user), brandVersion: brand.version, findingCount: s.findings.length })
  touch(s)
  s.history.push(historyEntry(req.user, 'reverified', `Checked against brand v${brand.version}`))
  await db.save('submissions', s)
  await notifyRoles(req.user.orgCode, [ROLES.MANAGER, ROLES.REVIEWER], {
    event: 'reverified',
    title: 'Re-verification finished',
    body: `${s.title} was checked against the current facts and rules.`,
    href: '/submission/' + s._id,
  })
  res.json(s)
})

export const markUpdated = asyncHandler(async (req, res) => {
  const s = await loadSubmission(req.user, req.params.id)
  const latest = s.versions[s.versions.length - 1]
  if (!s.lastImpactAt || !latest || latest.at <= s.lastImpactAt) {
    throw badRequest('Save an updated version of the content before marking this as updated.')
  }
  s.contentUpdatedAfterImpact = true
  touch(s)
  s.history.push(historyEntry(req.user, 'marked_updated', 'Marked as updated after a fact change'))
  await db.save('submissions', s)
  res.json(s)
})
