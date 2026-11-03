import * as db from '../db/index.js'
import { STATUS } from '../constants.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { latestText } from '../models/submission.model.js'

async function loadBrand(user) {
  const b = (await db.find('brands', { orgCode: user.orgCode }))[0]
  if (!b) throw new ApiError(404, 'Brand not found for this workspace.')
  return b
}

function uniqueFindingKey(s, f) {
  return `${s._id}|${f.ruleOrFactId || 'UNCOVERED'}|${String(f.claim || '').toLowerCase().replace(/\s+/g, ' ').trim()}`
}

function reviewerDecisionFor(s, f) {
  if (s.status === STATUS.CHANGES) return 'requested_changes'
  if (s.status === STATUS.APPROVED || s.status === STATUS.REREVIEW) {
    if (f.decision === 'ignored' || (f.status !== 'supported' && f.decision !== 'accepted')) return 'approved_anyway'
    return 'confirmed'
  }
  return null
}

function hintFor(r) {
  const decisions = r.accepted + r.ignored
  if (!r.flagged || !decisions) return 'Insufficient review history to identify a pattern.'
  if (r.ignored >= 2 && r.ignored >= r.accepted) return 'This rule is frequently ignored. Consider reviewing its clarity or relevance.'
  if (r.overrides >= 2) return 'Reviewers often disagree with this rule\'s findings. Review its definition and severity.'
  if (r.accepted >= 2 && r.accepted > r.ignored) return 'Creators generally accept the suggested correction. This rule appears useful.'
  return 'Insufficient review history to identify a pattern.'
}

function inRange(iso, from, to) {
  if (!iso) return true
  if (from && iso.slice(0, 10) < from) return false
  if (to && iso.slice(0, 10) > to) return false
  return true
}

export const getInsights = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  const q = req.query || {}
  const from = String(q.from || '').slice(0, 10)
  const to = String(q.to || '').slice(0, 10)
  const ruleFilter = String(q.rule || '').trim()
  const severity = String(q.severity || '').trim()
  const channel = String(q.channel || '').trim()
  const creatorDecision = String(q.creatorDecision || '').trim()
  const reviewerDecision = String(q.reviewerDecision || '').trim()

  const events = []
  const seen = new Set()
  const byId = new Map()
  const bump = (id, field) => {
    if (!id) id = 'UNCOVERED'
    if (!byId.has(id)) {
      byId.set(id, { id, flagged: 0, ignored: 0, accepted: 0, overrides: 0, claims: [], lastTriggered: null })
    }
    byId.get(id)[field] += 1
  }

  const lookup = (id) => {
    if (id === 'UNCOVERED') return { text: 'Claims with no matching fact or rule', severity: null, category: null }
    const fact = (brand.facts || []).find((f) => f.id === id)
    if (fact) return { text: fact.text, severity: null, category: 'fact' }
    const rule = (brand.rules || []).find((r) => r.id === id)
    if (rule) return { text: rule.text, severity: rule.severity, category: rule.category }
    return { text: 'Unknown guideline', severity: null, category: null }
  }

  for (const s of submissions) {
    if (channel && s.channel !== channel) continue
    if (!inRange(s.createdAt || s.updatedAt, from, to)) continue
    for (const f of s.findings || []) {
      if (f.status === 'supported') continue
      const id = f.ruleOrFactId || 'UNCOVERED'
      if (ruleFilter && id !== ruleFilter) continue
      const meta = lookup(id)
      if (severity && meta.severity && meta.severity !== severity) continue
      const creator = f.decision || ''
      if (creatorDecision && creator !== creatorDecision) continue
      const rev = reviewerDecisionFor(s, f) || ''
      if (reviewerDecision && rev !== reviewerDecision) continue

      const key = uniqueFindingKey(s, f)
      if (seen.has(key)) continue
      seen.add(key)

      bump(id, 'flagged')
      if (f.decision === 'ignored') bump(id, 'ignored')
      if (f.decision === 'accepted') bump(id, 'accepted')
      if ((s.status === STATUS.APPROVED || s.status === STATUS.REREVIEW) && f.decision === 'ignored') bump(id, 'overrides')
      const row = byId.get(id)
      if (row.claims.length < 8 && f.claim && !row.claims.includes(f.claim)) row.claims.push(f.claim)
      const triggered = s.updatedAt || s.createdAt
      if (!row.lastTriggered || triggered > row.lastTriggered) row.lastTriggered = triggered

      const lastComment = (s.comments || [])[s.comments.length - 1]
      events.push({
        id: key,
        guidelineId: id,
        submissionId: s._id,
        title: s.title,
        claim: f.claim,
        suggestedFix: f.suggestedFix,
        creatorDecision: f.decision,
        reviewerDecision: rev || null,
        reviewerComment: lastComment ? lastComment.text : null,
        submittedAt: s.createdAt,
        ruleVersion: f.ruleVersion || f.factVersion || 1,
        channel: s.channel,
        status: s.status,
        findingStatus: f.status,
      })
    }
  }

  const rows = [...byId.values()].map((r) => {
    const meta = lookup(r.id)
    const ignoreRate = r.flagged ? r.ignored / r.flagged : 0
    const overrideRate = r.flagged ? r.overrides / r.flagged : 0
    return {
      ...r,
      text: meta.text,
      severity: meta.severity,
      category: meta.category,
      ignoreRate,
      overrideRate,
      hint: hintFor(r),
    }
  }).sort((a, b) => b.flagged - a.flagged)

  res.json({
    organization: brand.organization,
    submissionCount: submissions.length,
    calculation: {
      flagged: 'Unique findings in the period (one count per submission + claim + guideline, not per version).',
      accepted: 'Findings where the creator applied the suggested correction.',
      ignored: 'Findings the creator explicitly ignored.',
      overrides: 'Approved (or later flagged for re-review after approval) submissions that still contained an ignored finding.',
    },
    rows,
    events,
    totals: {
      flagged: rows.reduce((n, r) => n + r.flagged, 0),
      ignored: rows.reduce((n, r) => n + r.ignored, 0),
      accepted: rows.reduce((n, r) => n + r.accepted, 0),
      overrides: rows.reduce((n, r) => n + r.overrides, 0),
    },
  })
})
