import { STATUS } from '../constants.js'

export function usesFact(sub, brand, factId) {
  return usesGuideline(sub, brand, factId)
}

export function usesGuideline(sub, brand, guidelineId) {
  if ((sub.impactedFactIds || []).includes(guidelineId)) return true
  if ((sub.findings || []).some((f) => f.ruleOrFactId === guidelineId)) return true
  const asset = (brand.assets || []).find((a) => a.id === sub.assetId)
  if (asset && (asset.linkedFactIds || []).includes(guidelineId)) return true
  if (asset && (asset.linkedRuleIds || []).includes(guidelineId)) return true
  return false
}

export function relatedSubmissions(submissions, brand, guidelineId) {
  return submissions.filter((s) => usesGuideline(s, brand, guidelineId))
}

export function impactPreview(submissions, brand, guidelineId) {
  const related = relatedSubmissions(submissions, brand, guidelineId)
  const assetIds = new Set()
  for (const a of brand.assets || []) {
    if ((a.linkedFactIds || []).includes(guidelineId) || (a.linkedRuleIds || []).includes(guidelineId)) assetIds.add(a.id)
  }
  for (const s of related) {
    if (s.assetId) assetIds.add(s.assetId)
  }
  const awaiting = related.filter((s) => s.status === STATUS.WAITING || s.status === STATUS.REREVIEW)
  const stale = related.filter((s) => s.stale)
  const findings = related.flatMap((s) => (s.findings || []).filter((f) => f.ruleOrFactId === guidelineId))
  return {
    affectedSubmissions: related.length,
    uniqueAssets: assetIds.size,
    awaitingReview: awaiting.length,
    pendingReverify: stale.length,
    affectedFindings: findings.length,
    related,
    assetIds: [...assetIds],
  }
}
