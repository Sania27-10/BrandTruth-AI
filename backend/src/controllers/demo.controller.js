import * as db from '../db/index.js'
import { ROLES, STATUS, SHARED_ORG, DEMO_PASSWORD, DEMO_ACCOUNTS } from '../constants.js'
import { makeBrand } from '../models/brand.model.js'
import { makeUser, publicUser } from '../models/user.model.js'
import { makeSubmission, historyEntry, label } from '../models/submission.model.js'
import { checkSync, applyFixes } from '../utils/checker.js'
import { SNACK_SAMPLE_TEXT, SNACK_APPROVED_COPY, SNACK_IGNORED_ADS } from '../utils/sampleData.js'
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

  await seedSnackCampaign(orgCode, brand, rahul, priya, t)

  return { orgCode, organization: brand.organization, users: packUsers(users), shared }
}

async function seedSnackCampaign(orgCode, brand, rahul, priya, t) {
  const byRahul = label(rahul)
  const byPriya = label(priya)

  const snackFindings = decideIgnored(checkSync(SNACK_SAMPLE_TEXT, brand), 'R-14')
  await db.insert('submissions', makeSubmission({
    orgCode, title: 'Healthy snack poster', creator: rahul.name, status: STATUS.WAITING,
    versions: [
      { no: 1, text: SNACK_SAMPLE_TEXT, by: byRahul, at: t },
      { no: 2, text: applyFixes(SNACK_SAMPLE_TEXT, snackFindings), by: byRahul, at: t },
    ],
    findings: snackFindings,
    history: [
      historyEntry(rahul, 'created', 'Checked against snack facts F-01 and rules R-13 / R-14'),
      historyEntry(rahul, 'submitted', 'Submitted for review (health claim ignored)'),
    ],
  }))

  for (const ch of SNACK_APPROVED_COPY) {
    const findings = checkSync(ch.text, brand)
    await db.insert('submissions', makeSubmission({
      orgCode, title: ch.title, creator: rahul.name, status: STATUS.APPROVED,
      assetId: ch.assetId, channel: ch.channel,
      versions: [{ no: 1, text: ch.text, by: byRahul, at: t }],
      findings,
      history: [
        historyEntry(rahul, 'created', 'Checked against brand rules'),
        historyEntry(rahul, 'submitted', 'Submitted for review'),
        historyEntry(priya, 'approved', 'Approved for the snack campaign'),
      ],
    }))
  }

  for (const extra of SNACK_IGNORED_ADS) {
    const findings = decideIgnored(checkSync(extra.text, brand), 'R-14')
    await db.insert('submissions', makeSubmission({
      orgCode, title: extra.title, creator: rahul.name, status: STATUS.APPROVED,
      versions: [{ no: 1, text: extra.text, by: byRahul, at: t }],
      findings,
      history: [
        historyEntry(rahul, 'created', 'Checked against brand rules'),
        historyEntry(rahul, 'submitted', 'Submitted with an ignored health claim'),
        historyEntry(priya, 'approved', 'Approved despite the ignored finding'),
      ],
    }))
  }
}

function snackAssetsMissing(brand) {
  const ids = new Set((brand.assets || []).map((a) => a.id))
  return !ids.has('A-05') || !ids.has('A-06') || !ids.has('A-07')
}

function snackRuleMissing(brand) {
  return !(brand.rules || []).some((r) => r.id === 'R-13')
}

async function migrateSnackCampaign(orgCode) {
  const brand = (await db.find('brands', { orgCode }))[0]
  if (!brand) return
  const fresh = makeBrand(orgCode)
  let changed = false
  if (snackRuleMissing(brand)) {
    const r13 = (fresh.rules || []).find((r) => r.id === 'R-13')
    if (r13) {
      brand.rules = brand.rules || []
      const idx = brand.rules.findIndex((r) => r.id === 'R-14')
      if (idx >= 0) brand.rules.splice(idx, 0, r13)
      else brand.rules.push(r13)
      changed = true
    }
  }
  const r14 = (brand.rules || []).find((r) => r.id === 'R-14')
  if (r14 && r14.safeWording === 'Made with wholesome ingredients') {
    r14.safeWording = 'Made with ragi, no refined sugar'
    changed = true
  }
  if (snackAssetsMissing(brand)) {
    const have = new Set((brand.assets || []).map((a) => a.id))
    for (const a of fresh.assets || []) {
      if (!have.has(a.id)) {
        brand.assets = brand.assets || []
        brand.assets.push(a)
        have.add(a.id)
        changed = true
      }
    }
    brand.counters = brand.counters || { fact: 4, rule: 14, asset: 7 }
    brand.counters.asset = Math.max(brand.counters.asset || 0, 7)
  }
  if (changed) await db.save('brands', brand)

  const titles = new Set((await db.find('submissions', { orgCode })).map((s) => s.title))
  if (titles.has('Healthy snack poster') && titles.has('Snack Instagram story')) return

  const users = await db.find('users', { orgCode })
  const rahul = users.find((u) => u.role === ROLES.CREATOR)
  const priya = users.find((u) => u.role === ROLES.REVIEWER)
  if (!rahul || !priya) return
  const t = new Date().toISOString()
  if (!titles.has('Healthy snack poster')) {
    const snackFindings = decideIgnored(checkSync(SNACK_SAMPLE_TEXT, brand), 'R-14')
    await db.insert('submissions', makeSubmission({
      orgCode, title: 'Healthy snack poster', creator: rahul.name, status: STATUS.WAITING,
      versions: [
        { no: 1, text: SNACK_SAMPLE_TEXT, by: label(rahul), at: t },
        { no: 2, text: applyFixes(SNACK_SAMPLE_TEXT, snackFindings), by: label(rahul), at: t },
      ],
      findings: snackFindings,
      history: [
        historyEntry(rahul, 'created', 'Checked against snack facts F-01 and rules R-13 / R-14'),
        historyEntry(rahul, 'submitted', 'Submitted for review (health claim ignored)'),
      ],
    }))
  }
  for (const ch of SNACK_APPROVED_COPY) {
    if (titles.has(ch.title)) continue
    await db.insert('submissions', makeSubmission({
      orgCode, title: ch.title, creator: rahul.name, status: STATUS.APPROVED,
      assetId: ch.assetId, channel: ch.channel,
      versions: [{ no: 1, text: ch.text, by: label(rahul), at: t }],
      findings: checkSync(ch.text, brand),
      history: [
        historyEntry(rahul, 'created', 'Checked against brand rules'),
        historyEntry(rahul, 'submitted', 'Submitted for review'),
        historyEntry(priya, 'approved', 'Approved for the snack campaign'),
      ],
    }))
  }
  for (const extra of SNACK_IGNORED_ADS) {
    if (titles.has(extra.title)) continue
    await db.insert('submissions', makeSubmission({
      orgCode, title: extra.title, creator: rahul.name, status: STATUS.APPROVED,
      versions: [{ no: 1, text: extra.text, by: label(rahul), at: t }],
      findings: decideIgnored(checkSync(extra.text, brand), 'R-14'),
      history: [
        historyEntry(rahul, 'created', 'Checked against brand rules'),
        historyEntry(rahul, 'submitted', 'Submitted with an ignored health claim'),
        historyEntry(priya, 'approved', 'Approved despite the ignored finding'),
      ],
    }))
  }
}

export async function ensureSharedDemo() {
  const brands = await db.find('brands', { orgCode: SHARED_ORG })
  const users = await db.find('users', { orgCode: SHARED_ORG })
  if (brands.length && users.some((u) => u.username === 'meera' && u.password === DEMO_PASSWORD)) {
    await migrateSnackCampaign(SHARED_ORG)
    return
  }
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
