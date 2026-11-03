import { STATUS } from '../constants.js'

export const label = (u) => `${u.name} (${u.role})`
export const now = () => new Date().toISOString()
export const latestText = (s) => s.versions[s.versions.length - 1].text

export function makeSubmission({ orgCode, title, creator, status = STATUS.DRAFT, versions, findings, comments = [], history, assetId = null, channel = null }) {
  const t = now()
  return {
    orgCode, title, creator, status, versions, findings, comments, history,
    assetId, channel, stale: false, impactedFactIds: [], lastImpactAt: null,
    contentUpdatedAfterImpact: false,
    verificationRuns: [],
    createdAt: t, updatedAt: t,
  }
}

export const historyEntry = (user, action, detail) => ({ at: now(), by: typeof user === 'string' ? user : label(user), action, detail })

export function summary(s) {
  const findings = s.findings || []
  const unresolved = findings.filter((f) => f.status !== 'supported' && f.decision !== 'accepted' && f.decision !== 'ignored').length
  const staleFindings = findings.filter((f) => f.stale).length
  return {
    id: s._id, title: s.title, status: s.status, creator: s.creator,
    version: s.versions.length, updatedAt: s.updatedAt,
    findingCount: findings.length,
    ignoredCount: findings.filter((f) => f.decision === 'ignored').length,
    acceptedCount: findings.filter((f) => f.decision === 'accepted').length,
    unresolvedCount: unresolved,
    staleFindingCount: staleFindings,
    stale: !!s.stale,
    assetId: s.assetId || null,
    channel: s.channel || null,
    reReviewReason: s.stale
      ? `A linked fact changed${(s.impactedFactIds || []).length ? ` (${(s.impactedFactIds || []).join(', ')})` : ''}. Re-verify before treating this as current.`
      : null,
  }
}

const CHECK_STATUSES = ['contradicted', 'needs_review', 'supported']

export function cleanFindings(list) {
  if (!Array.isArray(list)) return []
  return list.slice(0, 40).map((f, i) => ({
    id: String(f.id || 'f' + (i + 1)).slice(0, 20),
    claim: String(f.claim || '').slice(0, 300),
    status: CHECK_STATUSES.includes(f.status) ? f.status : 'needs_review',
    ruleOrFactId: f.ruleOrFactId ? String(f.ruleOrFactId).slice(0, 20) : null,
    reason: String(f.reason || '').slice(0, 400),
    suggestedFix: f.suggestedFix ? String(f.suggestedFix).slice(0, 300) : null,
    verified: f.verified === true,
    verifiedNote: f.verifiedNote ? String(f.verifiedNote).slice(0, 240) : null,
    source: ['code', 'ai', 'sample'].includes(f.source) ? f.source : 'code',
    decision: ['accepted', 'ignored'].includes(f.decision) ? f.decision : null,
    stale: f.stale === true,
    reverified: f.reverified === true,
    factVersion: f.factVersion || null,
    ruleVersion: f.ruleVersion || null,
    originalFactValue: f.originalFactValue ? String(f.originalFactValue).slice(0, 80) : null,
    updatedFactValue: f.updatedFactValue ? String(f.updatedFactValue).slice(0, 80) : null,
    staleReason: f.staleReason ? String(f.staleReason).slice(0, 300) : null,
  }))
}

export function findingKey(f) {
  return `${f.ruleOrFactId || 'none'}|${String(f.claim || '').toLowerCase().replace(/\s+/g, ' ').trim()}`
}

export function mergeFindings(previous, next) {
  const prev = new Map((previous || []).map((f) => [findingKey(f), f]))
  return (next || []).map((f) => {
    const old = prev.get(findingKey(f))
    if (!old) return { ...f, stale: false, reverified: true }
    return {
      ...f,
      decision: old.decision || null,
      stale: false,
      reverified: true,
      originalFactValue: old.originalFactValue || null,
      updatedFactValue: old.updatedFactValue || null,
    }
  })
}
