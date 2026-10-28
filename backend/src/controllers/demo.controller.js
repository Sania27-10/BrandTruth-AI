import * as db from '../db/index.js'
import { ROLES, STATUS } from '../constants.js'
import { makeBrand } from '../models/brand.model.js'
import { makeUser, publicUser } from '../models/user.model.js'
import { makeSubmission, historyEntry, label } from '../models/submission.model.js'
import { checkSync, applyFixes } from '../utils/checker.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// POST /api/demo/start : creates a private workspace with three roles and two starter submissions.
export const startDemo = asyncHandler(async (_req, res) => {
  let orgCode
  for (let i = 0; i < 20; i++) {
    orgCode = 'DEMO-' + Math.floor(1000 + Math.random() * 9000)
    if (!(await db.find('brands', { orgCode })).length) break
  }
  const brand = makeBrand(orgCode)
  await db.insert('brands', brand)

  const users = [
    makeUser({ name: 'Meera', role: ROLES.MANAGER, orgCode }),
    makeUser({ name: 'Rahul', role: ROLES.CREATOR, orgCode }),
    makeUser({ name: 'Priya', role: ROLES.REVIEWER, orgCode }),
  ]
  for (const u of users) await db.insert('users', u)

  const rahul = users[1]
  const by = label(rahul)
  const draftText = 'Weekend special: Buy 1 Get 1 on cold coffee, valid till 14 November.'
  const draft = makeSubmission({
    orgCode, title: 'Weekend special (draft)', creator: rahul.name, status: STATUS.DRAFT,
    versions: [{ no: 1, text: draftText, by, at: new Date().toISOString() }],
    findings: checkSync(draftText, brand),
    history: [historyEntry(rahul, 'created', 'Draft saved')],
  })
  await db.insert('submissions', draft)

  const original = "Buy 1 Get 1 on ALL drinks, till 20 November. India's best chai!"
  const findings = checkSync(original, brand).map((f) => ({
    ...f,
    decision: f.ruleOrFactId === 'R-12' ? 'ignored' : f.status === 'supported' ? null : 'accepted',
  }))
  const t = new Date().toISOString()
  const festival = makeSubmission({
    orgCode, title: 'Festival poster', creator: rahul.name, status: STATUS.WAITING,
    versions: [
      { no: 1, text: original, by, at: t },
      { no: 2, text: applyFixes(original, findings), by, at: t },
    ],
    findings,
    history: [
      historyEntry(rahul, 'created', 'Checked against brand rules'),
      historyEntry(rahul, 'submitted', 'Submitted for review (1 finding ignored)'),
    ],
  })
  await db.insert('submissions', festival)

  res.json({ orgCode, organization: brand.organization, users: users.map(publicUser) })
})
