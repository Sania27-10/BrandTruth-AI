import * as db from '../db/index.js'
import { STATUS } from '../constants.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'

async function loadBrand(user) {
  const b = (await db.find('brands', { orgCode: user.orgCode }))[0]
  if (!b) throw new ApiError(404, 'Brand not found for this workspace.')
  return b
}

export const getInsights = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const submissions = await db.find('submissions', { orgCode: req.user.orgCode })

  const byId = new Map()
  const bump = (id, field) => {
    if (!id) id = 'UNCOVERED'
    if (!byId.has(id)) byId.set(id, { id, flagged: 0, ignored: 0, accepted: 0, overrides: 0, claims: [] })
    byId.get(id)[field] += 1
  }

  for (const s of submissions) {
    const ignoredHere = (s.findings || []).filter((f) => f.decision === 'ignored')
    for (const f of s.findings || []) {
      if (f.status === 'supported') continue
      bump(f.ruleOrFactId, 'flagged')
      if (f.decision === 'ignored') bump(f.ruleOrFactId, 'ignored')
      if (f.decision === 'accepted') bump(f.ruleOrFactId, 'accepted')
      const row = byId.get(f.ruleOrFactId || 'UNCOVERED')
      if (row.claims.length < 8 && f.claim && !row.claims.includes(f.claim)) row.claims.push(f.claim)
    }
    if ((s.status === STATUS.APPROVED || s.status === STATUS.REREVIEW) && ignoredHere.length) {
      for (const f of ignoredHere) bump(f.ruleOrFactId, 'overrides')
    }
  }

  const lookupText = (id) => {
    if (id === 'UNCOVERED') return 'Claims with no matching fact or rule'
    const fact = (brand.facts || []).find((f) => f.id === id)
    if (fact) return fact.text
    const rule = (brand.rules || []).find((r) => r.id === id)
    if (rule) return rule.text
    return 'Unknown guideline'
  }

  const rows = [...byId.values()].map((r) => {
    const ignoreRate = r.flagged ? r.ignored / r.flagged : 0
    const overrideRate = r.flagged ? r.overrides / r.flagged : 0
    let hint = 'No strong pattern yet.'
    if (r.flagged >= 3 && ignoreRate >= 0.5) {
      hint = 'Reviewers often dismiss this flag. The wording of the rule is probably unclear, or the brand actually uses this language.'
    } else if (r.flagged >= 3 && ignoreRate < 0.2) {
      hint = 'Creators usually accept the suggested fix. The rule is doing useful work.'
    } else if (r.overrides >= 2) {
      hint = 'Content is still being approved while this flag is ignored. Worth a guideline review.'
    }
    return {
      ...r,
      text: lookupText(r.id),
      ignoreRate,
      overrideRate,
      hint,
    }
  }).sort((a, b) => b.flagged - a.flagged)

  res.json({
    organization: brand.organization,
    submissionCount: submissions.length,
    rows,
    totals: {
      flagged: rows.reduce((n, r) => n + r.flagged, 0),
      ignored: rows.reduce((n, r) => n + r.ignored, 0),
      accepted: rows.reduce((n, r) => n + r.accepted, 0),
      overrides: rows.reduce((n, r) => n + r.overrides, 0),
    },
  })
})
