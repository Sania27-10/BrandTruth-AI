import * as db from '../db/index.js'
import { STATUS } from '../constants.js'
import { historyEntry, latestText } from '../models/submission.model.js'
import { checkSync } from '../utils/checker.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { badRequest, ApiError } from '../utils/ApiError.js'

async function loadBrand(user) {
  const b = (await db.find('brands', { orgCode: user.orgCode }))[0]
  if (!b) throw new ApiError(404, 'Brand not found for this workspace.')
  return b
}

function usesFact(sub, factId) {
  if ((sub.impactedFactIds || []).includes(factId)) return true
  if ((sub.findings || []).some((f) => f.ruleOrFactId === factId)) return true
  return false
}

export async function applyFactChange(user, brand, fact, previous) {
  const list = await db.find('submissions', { orgCode: user.orgCode })
  const flagged = []
  const t = new Date().toISOString()

  for (const s of list) {
    const asset = (brand.assets || []).find((a) => a.id === s.assetId)
    const linkedByAsset = asset && (asset.linkedFactIds || []).includes(fact.id)
    if (!usesFact(s, fact.id) && !linkedByAsset) continue

    const text = latestText(s)
    const fresh = checkSync(text, brand)
    const prevDecisions = new Map((s.findings || []).map((f) => [f.id + '|' + f.claim, f.decision]))
    s.findings = fresh.map((f) => {
      const prev = prevDecisions.get(f.id + '|' + f.claim)
      return prev ? { ...f, decision: prev } : f
    })
    s.stale = true
    s.impactedFactIds = Array.from(new Set([...(s.impactedFactIds || []), fact.id]))
    s.lastImpactAt = t
    s.updatedAt = t
    if (s.status === STATUS.APPROVED) s.status = STATUS.REREVIEW
    s.history = s.history || []
    s.history.push(historyEntry(user, 'fact_changed', `${fact.id} changed (${previous} → ${describeValue(fact)}). Flagged for re-review.`))
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

  brand.factHistory = brand.factHistory || []
  brand.factHistory.push({
    factId: fact.id,
    previous,
    next: describeValue(fact),
    flagged: flagged.length,
    at: t,
    by: `${user.name} (${user.role})`,
  })
  await db.save('brands', brand)

  return { fact, previous, flagged }
}

function describeValue(fact) {
  if (fact.type === 'offer_scope') return fact.value?.approved || fact.text
  return String(fact.value)
}

export const getProofMesh = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const factId = String(req.query.factId || '').trim()
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  const facts = (brand.facts || []).filter((f) => f.active !== false)

  const chosen = facts.find((f) => f.id === factId) || facts.find((f) => f.id === 'F-04') || facts[0]
  if (!chosen) throw badRequest('This brand has no facts to graph yet.')

  const related = submissions.filter((s) => {
    const asset = (brand.assets || []).find((a) => a.id === s.assetId)
    return usesFact(s, chosen.id) || (asset && (asset.linkedFactIds || []).includes(chosen.id))
  })

  const nodes = [{ id: chosen.id, kind: 'fact', label: `${chosen.id} · ${chosen.text}`, stale: false }]
  const edges = []

  for (const a of brand.assets || []) {
    if (!(a.linkedFactIds || []).includes(chosen.id) && a.type === 'logo') continue
    if (!(a.linkedFactIds || []).includes(chosen.id) && !related.some((s) => s.assetId === a.id)) continue
    nodes.push({ id: a.id, kind: 'asset', label: a.name, stale: related.some((s) => s.assetId === a.id && s.stale) })
    edges.push({ from: chosen.id, to: a.id })
  }

  for (const s of related) {
    nodes.push({
      id: s._id,
      kind: 'submission',
      label: s.title,
      stale: !!s.stale,
      status: s.status,
      channel: s.channel,
    })
    edges.push({ from: chosen.id, to: s._id })
    if (s.assetId && nodes.some((n) => n.id === s.assetId)) {
      edges.push({ from: s.assetId, to: s._id })
    }
    for (const f of s.findings || []) {
      if (f.ruleOrFactId !== chosen.id) continue
      const cid = `claim-${s._id}-${f.id}`
      nodes.push({ id: cid, kind: 'claim', label: f.claim, stale: f.status !== 'supported', status: f.status })
      edges.push({ from: s._id, to: cid })
    }
  }

  res.json({
    fact: chosen,
    history: (brand.factHistory || []).filter((h) => h.factId === chosen.id),
    facts: facts.map((f) => ({
      id: f.id,
      text: f.text,
      linked: submissions.filter((s) => usesFact(s, f.id) || (brand.assets || []).some((a) => a.id === s.assetId && (a.linkedFactIds || []).includes(f.id))).length,
    })),
    nodes,
    edges,
    flaggedCount: related.filter((s) => s.stale).length,
  })
})
