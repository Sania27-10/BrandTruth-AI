import * as db from '../db/index.js'
import { FACT_TYPES, SEVERITIES, RULE_CATEGORIES, ROLES } from '../constants.js'
import { badRequest, ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { applyFactChange } from './proofmesh.controller.js'
import { defaultNote, displayValue } from '../utils/brandFormat.js'
import { impactPreview } from '../utils/impact.js'
import { notifyRoles } from '../utils/notify.js'
import { historyEntry, latestText, mergeFindings } from '../models/submission.model.js'
import { checkSync } from '../utils/checker.js'

export async function loadBrand(user) {
  const b = (await db.find('brands', { orgCode: user.orgCode }))[0]
  if (!b) throw new ApiError(404, 'Brand not found for this workspace.')
  return b
}

function parseFactValue(type, raw) {
  if (type === 'offer_scope') {
    if (raw && typeof raw === 'object') {
      const approved = String(raw.approved || '').trim()
      if (!approved) throw badRequest('Say which product the offer applies to.')
      const forbidden = Array.isArray(raw.forbidden)
        ? raw.forbidden.map((w) => String(w).trim()).filter(Boolean)
        : String(raw.forbidden || '').split(',').map((w) => w.trim()).filter(Boolean)
      return { approved, forbidden }
    }
    const approved = String(raw ?? '').trim()
    if (!approved) throw badRequest('Say which product the offer applies to.')
    return { approved, forbidden: [] }
  }
  const value = String(raw ?? '').trim()
  if (!value) throw badRequest('Please enter a value.')
  if (type === 'discount_percent') {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0 || n > 100) throw badRequest('Discount must be a number between 0 and 100.')
    return n
  }
  if (type === 'offer_end_date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest('Pick a valid date.')
  return value
}

function activity(brand, user, action, detail) {
  brand.activity = brand.activity || []
  brand.activity.push(historyEntry(user, action, detail))
}

function publicBrand(brand, submissions = []) {
  const assets = (brand.assets || []).map((a) => decorateAsset(a, brand, submissions))
  return { ...brand, assets }
}

function decorateAsset(asset, brand, submissions) {
  const linked = submissions.filter((s) => s.assetId === asset.id)
  const outdated = linked.filter((s) => s.stale || (s.findings || []).some((f) => f.stale && (asset.linkedFactIds || []).includes(f.ruleOrFactId)))
  const facts = (brand.facts || []).filter((f) => (asset.linkedFactIds || []).includes(f.id))
  const rules = (brand.rules || []).filter((r) => (asset.linkedRuleIds || []).includes(r.id))
  let verificationStatus = asset.verificationStatus || 'current'
  if (outdated.length) verificationStatus = 'outdated'
  else if (linked.some((s) => (s.findings || []).some((f) => f.reverified))) verificationStatus = linked.every((s) => !s.stale) ? 'reverified' : verificationStatus
  const previewSub = linked.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0]
  return {
    ...asset,
    verificationStatus,
    linkedFacts: facts.map((f) => ({ id: f.id, text: f.text, value: displayValue(f) })),
    linkedRules: rules.map((r) => ({ id: r.id, text: r.text })),
    linkedSubmissions: linked.map((s) => ({
      id: s._id,
      title: s.title,
      status: s.status,
      stale: !!s.stale,
      version: s.versions.length,
      text: latestText(s),
      outdatedClaims: (s.findings || []).filter((f) => f.stale).map((f) => f.claim),
    })),
    previewText: previewSub ? latestText(previewSub) : (asset.content || asset.note || ''),
    lastVerificationDate: asset.lastVerifiedAt || null,
  }
}

export const getBrand = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  res.json(publicBrand(brand, submissions))
})

export const addFact = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const body = req.body || {}
  const type = String(body.type || '')
  if (!FACT_TYPES.includes(type)) throw badRequest('Choose a fact type.')
  const value = parseFactValue(type, body.value)
  const t = new Date().toISOString()
  const who = `${req.user.name} (${req.user.role})`
  brand.counters.fact += 1
  const fact = {
    id: 'F-' + String(brand.counters.fact).padStart(2, '0'),
    type,
    value,
    text: defaultNote(type, value),
    description: String(body.text || body.description || '').trim().slice(0, 200),
    source: String(body.source || '').trim().slice(0, 200) || null,
    effectiveDate: String(body.effectiveDate || '').trim().slice(0, 10) || null,
    previousValue: null,
    version: 1,
    createdAt: t,
    updatedAt: t,
    modifiedBy: who,
    versions: [],
    active: true,
  }
  brand.facts.push(fact)
  brand.version += 1
  activity(brand, req.user, 'fact_added', `${fact.id} added (${displayValue(fact)})`)
  await db.save('brands', brand)
  await notifyRoles(req.user.orgCode, [ROLES.CREATOR, ROLES.REVIEWER, ROLES.MANAGER], {
    event: 'fact_added',
    title: `New fact ${fact.id}`,
    body: `${fact.text}. It applies to the next content check.`,
    href: '/brand',
  })
  res.json({ brand: publicBrand(brand, await db.find('submissions', { orgCode: req.user.orgCode })), added: fact })
})

export const previewFactChange = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const fact = (brand.facts || []).find((f) => f.id === req.params.id)
  if (!fact) throw badRequest('That fact is not in this brand library.')
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  const preview = impactPreview(submissions, brand, fact.id)
  res.json({
    fact: {
      id: fact.id,
      type: fact.type,
      currentValue: displayValue(fact),
      previousValue: fact.previousValue,
      version: fact.version || 1,
      text: fact.text,
    },
    affectedSubmissions: preview.affectedSubmissions,
    uniqueAssets: preview.uniqueAssets,
    awaitingReview: preview.awaitingReview,
    affectedFindings: preview.affectedFindings,
  })
})

export const updateFact = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  if (req.body?.baseVersion != null && Number(req.body.baseVersion) !== brand.version) {
    throw new ApiError(409, 'This brand library changed in another tab. Refresh and try again.')
  }
  const fact = (brand.facts || []).find((f) => f.id === req.params.id)
  if (!fact) throw badRequest('That fact is not in this brand library.')
  const body = req.body || {}
  const previousDisplay = displayValue(fact)
  const previousValue = fact.value
  const previousText = fact.text
  const previousVersion = fact.version || 1
  if (body.value !== undefined) fact.value = parseFactValue(fact.type, body.value)
  fact.text = defaultNote(fact.type, fact.value)
  fact.description = body.description !== undefined
    ? String(body.description || '').trim().slice(0, 200)
    : (body.text !== undefined ? String(body.text || '').trim().slice(0, 200) : (fact.description || ''))
  if (body.source !== undefined) fact.source = String(body.source || '').trim().slice(0, 200) || null
  if (body.active === false) fact.active = false
  if (body.active === true) fact.active = true

  const nextDisplay = displayValue(fact)
  const t = new Date().toISOString()
  const who = `${req.user.name} (${req.user.role})`
  fact.versions = fact.versions || []
  fact.versions.push({
    version: previousVersion,
    value: previousValue,
    text: previousText,
    source: fact.source,
    reason: String(body.reason || '').trim().slice(0, 300) || 'Updated by manager',
    at: t,
    by: who,
  })
  fact.previousValue = previousDisplay
  fact.version = previousVersion + 1
  fact.updatedAt = t
  fact.modifiedBy = who
  brand.version += 1
  activity(brand, req.user, 'fact_changed', `${fact.id} ${previousDisplay} → ${nextDisplay}`)
  await db.save('brands', brand)
  const impact = await applyFactChange(req.user, brand, fact, previousDisplay, String(body.reason || '').trim())
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  res.json({ brand: publicBrand(brand, submissions), updated: fact, impact })
})

export const addRule = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const body = req.body || {}
  const text = String(body.text || '').trim().slice(0, 300)
  if (!text) throw badRequest('Please describe the rule.')
  const words = Array.isArray(body.bannedWords) ? body.bannedWords : String(body.bannedWords || '').split(',')
  const bannedWords = words.map((w) => String(w).trim()).filter(Boolean).slice(0, 30)
  const severity = SEVERITIES.includes(body.severity) ? body.severity : 'medium'
  const category = RULE_CATEGORIES.includes(body.category) ? body.category : 'claims'
  const t = new Date().toISOString()
  const who = `${req.user.name} (${req.user.role})`
  brand.counters.rule += 1
  const rule = {
    id: 'R-' + String(brand.counters.rule).padStart(2, '0'),
    text,
    bannedWords,
    severity,
    category,
    safeWording: String(body.safeWording || '').trim().slice(0, 200) || null,
    explanation: String(body.explanation || '').trim().slice(0, 400) || '',
    version: 1,
    versions: [],
    createdAt: t,
    updatedAt: t,
    modifiedBy: who,
    active: true,
  }
  brand.rules.push(rule)
  brand.version += 1
  activity(brand, req.user, 'rule_added', `${rule.id} added`)
  await db.save('brands', brand)
  await notifyRoles(req.user.orgCode, [ROLES.CREATOR], {
    event: 'rule_added',
    title: `New rule ${rule.id}`,
    body: rule.text,
    href: '/check',
  })
  res.json({ brand: publicBrand(brand, await db.find('submissions', { orgCode: req.user.orgCode })), added: rule })
})

export const updateRule = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const rule = (brand.rules || []).find((r) => r.id === req.params.id)
  if (!rule) throw badRequest('That rule is not in this brand library.')
  const body = req.body || {}
  const t = new Date().toISOString()
  const who = `${req.user.name} (${req.user.role})`
  rule.versions = rule.versions || []
  rule.versions.push({
    version: rule.version || 1,
    text: rule.text,
    bannedWords: rule.bannedWords,
    severity: rule.severity,
    category: rule.category,
    safeWording: rule.safeWording,
    explanation: rule.explanation,
    at: t,
    by: who,
  })
  if (body.text !== undefined) {
    const next = String(body.text || '').trim().slice(0, 300)
    if (!next) throw badRequest('Please describe the rule.')
    rule.text = next
  }
  if (body.bannedWords !== undefined) {
    const words = Array.isArray(body.bannedWords) ? body.bannedWords : String(body.bannedWords || '').split(',')
    rule.bannedWords = words.map((w) => String(w).trim()).filter(Boolean).slice(0, 30)
  }
  if (body.severity !== undefined) {
    if (!SEVERITIES.includes(body.severity)) throw badRequest('Choose a severity.')
    rule.severity = body.severity
  }
  if (body.category !== undefined) {
    rule.category = RULE_CATEGORIES.includes(body.category) ? body.category : rule.category
  }
  if (body.safeWording !== undefined) rule.safeWording = String(body.safeWording || '').trim().slice(0, 200) || null
  if (body.explanation !== undefined) rule.explanation = String(body.explanation || '').trim().slice(0, 400)
  if (body.active === false || body.active === true) rule.active = body.active
  rule.version = (rule.version || 1) + 1
  rule.updatedAt = t
  rule.modifiedBy = who
  brand.version += 1
  activity(brand, req.user, 'rule_changed', `${rule.id} updated to v${rule.version}`)
  await db.save('brands', brand)
  res.json({ brand: publicBrand(brand, await db.find('submissions', { orgCode: req.user.orgCode })), updated: rule })
})

export const getAsset = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const asset = (brand.assets || []).find((a) => a.id === req.params.id)
  if (!asset) throw badRequest('That asset is not in this brand library.')
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  res.json(decorateAsset(asset, brand, submissions))
})

export const updateAsset = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const asset = (brand.assets || []).find((a) => a.id === req.params.id)
  if (!asset) throw badRequest('That asset is not in this brand library.')
  const body = req.body || {}
  if (body.name !== undefined) asset.name = String(body.name || '').trim().slice(0, 80) || asset.name
  if (body.note !== undefined) asset.note = String(body.note || '').trim().slice(0, 300)
  if (body.content !== undefined) asset.content = String(body.content || '').trim().slice(0, 3000)
  if (body.channel !== undefined) asset.channel = String(body.channel || '').trim().slice(0, 40) || asset.channel
  asset.lastModifiedAt = new Date().toISOString()
  brand.version += 1
  activity(brand, req.user, 'asset_updated', `${asset.id} updated`)
  await db.save('brands', brand)
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  res.json({ brand: publicBrand(brand, submissions), updated: decorateAsset(asset, brand, submissions) })
})

export const reverifyAsset = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const asset = (brand.assets || []).find((a) => a.id === req.params.id)
  if (!asset) throw badRequest('That asset is not in this brand library.')
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })
  const linked = submissions.filter((s) => s.assetId === asset.id)
  const results = []
  for (const s of linked) {
    const fresh = checkSync(latestText(s), brand)
    s.findings = mergeFindings(s.findings, fresh)
    s.stale = (s.findings || []).some((f) => f.stale)
    s.verificationRuns = s.verificationRuns || []
    s.verificationRuns.push({ at: new Date().toISOString(), by: `${req.user.name} (${req.user.role})`, brandVersion: brand.version, findingCount: s.findings.length })
    s.updatedAt = new Date().toISOString()
    s.history.push(historyEntry(req.user, 'reverified', `Re-verified against brand v${brand.version}`))
    await db.save('submissions', s)
    results.push({ id: s._id, title: s.title, stale: s.stale })
  }
  asset.lastVerifiedAt = new Date().toISOString()
  asset.verificationStatus = results.some((r) => r.stale) ? 'outdated' : 'reverified'
  await db.save('brands', brand)
  await notifyRoles(req.user.orgCode, [ROLES.MANAGER, ROLES.REVIEWER], {
    event: 'reverified',
    title: `${asset.name} re-verified`,
    body: results.length ? `${results.length} linked submission(s) checked against the current facts.` : 'No linked submissions to check.',
    href: '/proofmesh',
  })
  const freshSubs = await db.find('submissions', { orgCode: req.user.orgCode })
  res.json({ asset: decorateAsset(asset, brand, freshSubs), results })
})
