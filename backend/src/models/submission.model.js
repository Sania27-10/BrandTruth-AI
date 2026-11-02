import { STATUS } from '../constants.js'

export const label = (u) => `${u.name} (${u.role})`
export const now = () => new Date().toISOString()
export const latestText = (s) => s.versions[s.versions.length - 1].text

export function makeSubmission({ orgCode, title, creator, status = STATUS.DRAFT, versions, findings, comments = [], history, assetId = null, channel = null }) {
  const t = now()
  return {
    orgCode, title, creator, status, versions, findings, comments, history,
    assetId, channel, stale: false, impactedFactIds: [], lastImpactAt: null,
    createdAt: t, updatedAt: t,
  }
}

export const historyEntry = (user, action, detail) => ({ at: now(), by: typeof user === 'string' ? user : label(user), action, detail })

// Short form used by list screens.
export function summary(s) {
  return {
    id: s._id, title: s.title, status: s.status, creator: s.creator,
    version: s.versions.length, updatedAt: s.updatedAt,
    findingCount: (s.findings || []).length,
    ignoredCount: (s.findings || []).filter((f) => f.decision === 'ignored').length,
    stale: !!s.stale,
    assetId: s.assetId || null,
    channel: s.channel || null,
  }
}

// Keeps only the fields we expect from the browser.
export function cleanFindings(list) {
  if (!Array.isArray(list)) return []
  return list.slice(0, 40).map((f, i) => ({
    id: String(f.id || 'f' + (i + 1)).slice(0, 20),
    claim: String(f.claim || '').slice(0, 300),
    status: ['contradicted', 'needs_review', 'supported'].includes(f.status) ? f.status : 'needs_review',
    ruleOrFactId: f.ruleOrFactId ? String(f.ruleOrFactId).slice(0, 20) : null, // saved now, used by ProofMesh in Round 3
    reason: String(f.reason || '').slice(0, 400),
    suggestedFix: f.suggestedFix ? String(f.suggestedFix).slice(0, 300) : null,
    verified: f.verified === true,
    verifiedNote: f.verifiedNote ? String(f.verifiedNote).slice(0, 240) : null,
    decision: ['accepted', 'ignored'].includes(f.decision) ? f.decision : null,
  }))
}
