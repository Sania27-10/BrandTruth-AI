import * as db from '../db/index.js'
import { ROLES, STATUS, SHARED_ORG, DEMO_PASSWORD, DEMO_ACCOUNTS } from '../constants.js'
import { makeBrand } from '../models/brand.model.js'
import { makeUser, publicUser } from '../models/user.model.js'
import { makeSubmission, historyEntry, label } from '../models/submission.model.js'
import { checkSync, applyFixes } from '../utils/checker.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { badRequest } from '../utils/ApiError.js'

function decideIgnored(findings, ruleId) {
  return findings.map((f) => ({
    ...f,
    decision: f.ruleOrFactId === ruleId ? 'ignored' : f.status === 'supported' ? null : 'accepted',
  }))
}

function packUsers(users) {
  return users.map(publicUser)
}

async function uniqueOrgCode() {
  for (let i = 0; i < 20; i++) {
    const orgCode = 'DEMO-' + Math.floor(1000 + Math.random() * 9000)
    if (!(await db.find('brands', { orgCode })).length) return orgCode
  }
  return 'DEMO-' + Date.now().toString().slice(-6)
}

export async function seedWorkspace(orgCode, { shared = false } = {}) {
  const brand = makeBrand(orgCode)
  await db.insert('brands', brand)

  const users = DEMO_ACCOUNTS.map((a) => makeUser({
    name: a.name,
    role: a.role,
    orgCode,
    username: shared ? a.username : null,
    password: shared ? DEMO_PASSWORD : null,
  }))
  for (const u of users) await db.insert('users', u)

  const rahul = users.find((u) => u.role === ROLES.CREATOR)
  const priya = users.find((u) => u.role === ROLES.REVIEWER)
  const byRahul = label(rahul)
  const byPriya = label(priya)
  const t = new Date().toISOString()

  const draftText = 'Weekend special: Buy 1 Get 1 on cold coffee, valid till 14 November.'
  await db.insert('submissions', makeSubmission({
    orgCode, title: 'Weekend special (draft)', creator: rahul.name, status: STATUS.DRAFT,
    versions: [{ no: 1, text: draftText, by: byRahul, at: t }],
    findings: checkSync(draftText, brand),
    history: [historyEntry(rahul, 'created', 'Draft saved')],
  }))

  const original = "Buy 1 Get 1 on ALL drinks, till 20 November. India's best chai!"
  const festivalFindings = decideIgnored(checkSync(original, brand), 'R-12')
  await db.insert('submissions', makeSubmission({
    orgCode, title: 'Festival poster', creator: rahul.name, status: STATUS.WAITING,
    versions: [
      { no: 1, text: original, by: byRahul, at: t },
      { no: 2, text: applyFixes(original, festivalFindings), by: byRahul, at: t },
    ],
    findings: festivalFindings,
    history: [
      historyEntry(rahul, 'created', 'Checked against brand rules'),
      historyEntry(rahul, 'submitted', 'Submitted for review (1 finding ignored)'),
    ],
  }))

  const channels = [
    { title: 'Instagram story', assetId: 'A-02', channel: 'instagram', text: 'Last day! Buy 1 Get 1 on cold coffee, till 14 November.' },
    { title: 'Table card', assetId: 'A-03', channel: 'print', text: 'Buy 1 Get 1 on cold coffee, till 14 November. Ask at the counter.' },
    { title: 'WhatsApp message', assetId: 'A-04', channel: 'whatsapp', text: 'Offer ends 14 November. Cold coffee Buy 1 Get 1 is on.' },
  ]
  for (const ch of channels) {
    const findings = checkSync(ch.text, brand)
    await db.insert('submissions', makeSubmission({
      orgCode, title: ch.title, creator: rahul.name, status: STATUS.APPROVED,
      assetId: ch.assetId, channel: ch.channel,
      versions: [{ no: 1, text: ch.text, by: byRahul, at: t }],
      findings,
      history: [
        historyEntry(rahul, 'created', 'Checked against brand rules'),
        historyEntry(rahul, 'submitted', 'Submitted for review'),
        historyEntry(priya, 'approved', 'Approved for publication'),
      ],
    }))
  }

  const extraIgnored = [
    { title: 'Lane chalkboard', text: "Best cutting chai in the lane, every evening." },
    { title: 'Evening tapri ad', text: 'Our finest evening tapri. Come sit a while.' },
    { title: 'Kulhad flyer', text: "India's best kulhad, poured at the window." },
    { title: 'Station poster', text: 'Number one chai stall near the station.' },
  ]
  for (const extra of extraIgnored) {
    const findings = decideIgnored(checkSync(extra.text, brand), 'R-12')
    await db.insert('submissions', makeSubmission({
      orgCode, title: extra.title, creator: rahul.name, status: STATUS.APPROVED,
      versions: [{ no: 1, text: extra.text, by: byRahul, at: t }],
      findings,
      history: [
        historyEntry(rahul, 'created', 'Checked against brand rules'),
        historyEntry(rahul, 'submitted', 'Submitted with an ignored superlative'),
        historyEntry(priya, 'approved', 'Approved despite the ignored finding'),
      ],
    }))
  }

  return { orgCode, organization: brand.organization, users: packUsers(users), shared }
}

export async function ensureSharedDemo() {
  const brands = await db.find('brands', { orgCode: SHARED_ORG })
  const users = await db.find('users', { orgCode: SHARED_ORG })
  if (brands.length && users.some((u) => u.username === 'meera' && u.password === DEMO_PASSWORD)) return
  if (brands.length || users.length) {
    // leftover from an older seed — leave it; login still works if passwords match
    if (users.some((u) => u.username === 'meera')) return
  }
  await seedWorkspace(SHARED_ORG, { shared: true })
  console.log('[demo] shared workspace ready:', SHARED_ORG)
}

export const startDemo = asyncHandler(async (_req, res) => {
  const orgCode = await uniqueOrgCode()
  const packed = await seedWorkspace(orgCode, { shared: false })
  res.json(packed)
})

export const demoInfo = asyncHandler(async (_req, res) => {
  await ensureSharedDemo()
  res.json({
    orgCode: SHARED_ORG,
    organization: 'Chai Tapri Co.',
    password: DEMO_PASSWORD,
    accounts: DEMO_ACCOUNTS.map((a) => ({ ...a, password: DEMO_PASSWORD })),
  })
})

export const loginDemo = asyncHandler(async (req, res) => {
  await ensureSharedDemo()
  const username = String(req.body?.username || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const roleHint = String(req.body?.role || '').trim().toLowerCase()
  if (!username && !roleHint) throw badRequest('Enter a username, or pick a demo role.')
  const users = await db.find('users', { orgCode: SHARED_ORG })
  let user = username ? users.find((u) => u.username === username) : users.find((u) => u.role === roleHint)
  if (!user) throw badRequest('Unknown demo account. Use meera, rahul, or priya.')
  if (user.password && password && password !== user.password) throw badRequest('Wrong password. Use chai-tapri (shown on this page).')
  if (user.password && !password && !roleHint) throw badRequest('Password is required.')
  res.json({
    orgCode: SHARED_ORG,
    organization: 'Chai Tapri Co.',
    users: packUsers(users),
    signedInAs: user.role,
    shared: true,
  })
})
