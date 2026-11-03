import * as db from '../db/index.js'
import { STATUS, ROLES } from '../constants.js'
import { historyEntry, latestText } from '../models/submission.model.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { badRequest, ApiError } from '../utils/ApiError.js'
import { displayValue } from '../utils/brandFormat.js'
import { impactPreview, relatedSubmissions, usesFact } from '../utils/impact.js'
import { notifyRoles } from '../utils/notify.js'

async function loadBrand(user) {
  const b = (await db.find('brands', { orgCode: user.orgCode }))[0]
  if (!b) throw new ApiError(404, 'Brand not found for this workspace.')
  return b
}

export async function applyFactChange(user, brand, fact, previous, reason = '') {
  const list = await db.find('submissions', { orgCode: user.orgCode })
  const flagged = []
  const t = new Date().toISOString()
  const next = displayValue(fact)

  for (const s of list) {
    if (!usesFact(s, brand, fact.id)) continue

    s.findings = (s.findings || []).map((f) => {
      if (f.ruleOrFactId !== fact.id) return f
      return {
        ...f,
        stale: true,
        reverified: false,
        originalFactValue: previous,
        updatedFactValue: next,
        staleReason: `${fact.id} changed from ${previous} to ${next}. This claim was checked against the old value and needs re-verification.`,
      }
    })
    s.stale = true
    s.contentUpdatedAfterImpact = false
    s.impactedFactIds = Array.from(new Set([...(s.impactedFactIds || []), fact.id]))
    s.lastImpactAt = t
    s.updatedAt = t
    if (s.status === STATUS.APPROVED) s.status = STATUS.REREVIEW
    s.history = s.history || []
    s.history.push(historyEntry(user, 'fact_changed', `${fact.id} changed (${previous} → ${next}). Flagged for re-review.${reason ? ' Reason: ' + reason : ''}`))
    await db.save('submissions', s)
    flagged.push({
      id: s._id,
      title: s.title,
      status: s.status,
      assetId: s.assetId,
      channel: s.channel,
      claims: (s.findings || []).filter((f) => f.ruleOrFactId === fact.id).map((f) => f.claim),
    })
  }

  for (const a of brand.assets || []) {
    if (!(a.linkedFactIds || []).includes(fact.id) && !flagged.some((x) => x.assetId === a.id)) continue
    a.verificationStatus = 'outdated'
    a.lastModifiedAt = t
  }

  brand.factHistory = brand.factHistory || []
  brand.factHistory.push({
    factId: fact.id,
    previous,
    next,
    flagged: flagged.length,
    reason: reason || null,
    at: t,
    by: `${user.name} (${user.role})`,
  })
  await db.save('brands', brand)

  await notifyRoles(user.orgCode, [ROLES.MANAGER, ROLES.CREATOR, ROLES.REVIEWER], {
    event: 'fact_changed',
    title: `${fact.id} changed`,
    body: `${previous} → ${next}. ${flagged.length} linked item(s) need re-verification.`,
    href: '/proofmesh',
  })
  if (flagged.length) {
    await notifyRoles(user.orgCode, [ROLES.MANAGER, ROLES.CREATOR], {
      event: 'asset_flagged',
      title: 'Assets flagged after a fact change',
      body: flagged.map((x) => x.title).slice(0, 4).join(', '),
      href: '/proofmesh',
    })
  }

  return { fact, previous, flagged }
}

export const getProofMesh = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const guidelineId = String(req.query.factId || req.query.guidelineId || '').trim()
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  const facts = (brand.facts || []).filter((f) => f.active !== false)
  const rules = (brand.rules || []).filter((r) => r.active !== false)

  const chosenFact = facts.find((f) => f.id === guidelineId)
  const chosenRule = rules.find((r) => r.id === guidelineId)
  const chosen = chosenFact || chosenRule || facts.find((f) => f.id === 'F-04') || facts[0] || rules[0]
  if (!chosen) throw badRequest('This brand has no facts or rules to graph yet.')
  const isRule = !chosenFact && !!(chosenRule || (chosen.id && String(chosen.id).startsWith('R-')))

  const related = relatedSubmissions(submissions, brand, chosen.id)
  const preview = impactPreview(submissions, brand, chosen.id)
  const reVerified = related.filter((s) => !s.stale && (s.findings || []).some((f) => f.reverified && f.ruleOrFactId === chosen.id))
  const unresolvedClaims = related.flatMap((s) => (s.findings || []).filter((f) => f.ruleOrFactId === chosen.id && (f.stale || (f.status !== 'supported' && f.decision !== 'accepted'))))
  const currentValue = isRule ? (chosen.safeWording || chosen.text) : displayValue(chosen)

  const nodes = [{
    id: chosen.id,
    kind: isRule ? 'rule' : 'fact',
    label: `${chosen.id} · ${chosen.text}`,
    stale: false,
    detail: {
      factId: chosen.id,
      currentValue,
      previousValue: chosen.previousValue || null,
      version: chosen.version || 1,
      dependentAssets: preview.uniqueAssets,
      affectedSubmissions: preview.affectedSubmissions,
      history: (brand.factHistory || []).filter((h) => h.factId === chosen.id),
    },
  }]
  const edges = []

  for (const a of brand.assets || []) {
    const assetLinked = (a.linkedFactIds || []).includes(chosen.id) || (a.linkedRuleIds || []).includes(chosen.id)
    if (!assetLinked && a.type === 'logo') continue
    if (!assetLinked && !related.some((s) => s.assetId === a.id)) continue
    const linkedSubs = related.filter((s) => s.assetId === a.id)
    const stale = linkedSubs.some((s) => s.stale)
    const allReverified = linkedSubs.length > 0 && linkedSubs.every((s) => !s.stale)
    nodes.push({
      id: a.id,
      kind: 'asset',
      label: a.name,
      stale,
      state: stale ? 'flagged' : allReverified ? 'reverified' : 'current',
      detail: {
        assetId: a.id,
        name: a.name,
        type: a.type,
        channel: a.channel,
        preview: linkedSubs[0] ? latestText(linkedSubs[0]) : (a.content || a.note),
        linkedFact: chosen.id,
        campaign: a.campaign || null,
        linkedSubmissions: linkedSubs.map((s) => ({ id: s._id, title: s.title, status: s.status, stale: !!s.stale })),
        verificationState: stale ? 'outdated' : allReverified ? 'reverified' : (a.verificationStatus || 'current'),
      },
    })
    edges.push({ from: chosen.id, to: a.id })
  }

  const versionNodeId = `${chosen.id}-v${(chosen.version || 1) - 1}`
  if (!isRule && chosen.previousValue) {
    nodes.push({
      id: versionNodeId,
      kind: 'version',
      label: `Previous: ${chosen.previousValue}`,
      stale: false,
      detail: { previousValue: chosen.previousValue, currentValue, factId: chosen.id },
    })
    edges.push({ from: versionNodeId, to: chosen.id })
  }

  for (const s of related) {
    const subStale = !!s.stale
    const subReverified = !s.stale && (s.findings || []).some((f) => f.reverified)
    nodes.push({
      id: s._id,
      kind: 'submission',
      label: s.title,
      stale: subStale,
      state: subStale ? 'flagged' : subReverified ? 'reverified' : 'current',
      status: s.status,
      channel: s.channel,
      href: '/submission/' + s._id,
      detail: {
        submissionId: s._id,
        title: s.title,
        status: s.status,
        version: s.versions.length,
        creator: s.creator,
        text: latestText(s),
        stale: subStale,
      },
    })
    edges.push({ from: chosen.id, to: s._id })
    if (s.assetId && nodes.some((n) => n.id === s.assetId)) {
      edges.push({ from: s.assetId, to: s._id })
    }
    for (const f of s.findings || []) {
      if (f.ruleOrFactId !== chosen.id) continue
      const cid = `claim-${s._id}-${f.id}`
      nodes.push({
        id: cid,
        kind: 'claim',
        label: f.claim,
        stale: !!f.stale,
        state: f.status === 'contradicted' ? 'contradicted' : f.stale ? 'flagged' : f.reverified ? 'reverified' : f.status,
        status: f.status,
        detail: {
          claim: f.claim,
          originalFactValue: f.originalFactValue || chosen.previousValue,
          updatedFactValue: f.updatedFactValue || currentValue,
          factId: chosen.id,
          submissionId: s._id,
          submissionTitle: s.title,
          submissionVersion: s.versions.length,
          reason: f.staleReason || f.reason,
          suggestedFix: f.suggestedFix,
          stale: !!f.stale,
          status: f.status,
          decision: f.decision,
        },
      })
      edges.push({ from: s._id, to: cid })
    }
  }

  res.json({
    fact: chosen,
    history: (brand.factHistory || []).filter((h) => h.factId === chosen.id),
    kind: isRule ? 'rule' : 'fact',
    facts: facts.map((f) => ({
      id: f.id,
      text: f.text,
      linked: relatedSubmissions(submissions, brand, f.id).length,
    })),
    rules: rules.map((r) => ({
      id: r.id,
      text: r.text,
      linked: relatedSubmissions(submissions, brand, r.id).length,
    })),
    nodes,
    edges,
    summary: {
      affectedSubmissions: preview.affectedSubmissions,
      uniqueAssets: preview.uniqueAssets,
      pendingReverify: preview.pendingReverify,
      reVerified: reVerified.length,
      unresolvedClaims: unresolvedClaims.length,
    },
    flaggedCount: related.filter((s) => s.stale).length,
  })
})
