import * as db from '../db/index.js'
import { FACT_TYPES, SEVERITIES } from '../constants.js'
import { badRequest, ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export async function loadBrand(user) {
  const b = (await db.find('brands', { orgCode: user.orgCode }))[0]
  if (!b) throw new ApiError(404, 'Brand not found for this workspace.')
  return b
}

// GET /api/brand
export const getBrand = asyncHandler(async (req, res) => {
  res.json(await loadBrand(req.user))
})

// POST /api/brand/facts  (manager)
export const addFact = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const body = req.body || {}
  const type = String(body.type || '')
  if (!FACT_TYPES.includes(type)) throw badRequest('Choose a fact type.')
  let value = String(body.value ?? '').trim()
  if (!value) throw badRequest('Please enter a value.')
  if (type === 'discount_percent') {
    value = Number(value)
    if (!Number.isFinite(value) || value < 0 || value > 100) throw badRequest('Discount must be a number between 0 and 100.')
  }
  if (type === 'offer_end_date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw badRequest('Pick a valid date.')
  const defaults = {
    discount_percent: `Approved discount is ${value}%`,
    offer_end_date: `Offer ends ${value}`,
    product_name: `Approved product name: ${value}`,
    other: String(value),
  }
  const text = String(body.text || '').trim().slice(0, 200) || defaults[type]
  brand.counters.fact += 1
  const fact = { id: 'F-' + String(brand.counters.fact).padStart(2, '0'), type, value, text, active: true }
  brand.facts.push(fact)
  brand.version += 1
  await db.save('brands', brand)
  res.json({ brand, added: fact })
})

// POST /api/brand/rules  (manager)
export const addRule = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const body = req.body || {}
  const text = String(body.text || '').trim().slice(0, 300)
  if (!text) throw badRequest('Please describe the rule.')
  const words = Array.isArray(body.bannedWords) ? body.bannedWords : String(body.bannedWords || '').split(',')
  const bannedWords = words.map((w) => String(w).trim()).filter(Boolean).slice(0, 30)
  const severity = SEVERITIES.includes(body.severity) ? body.severity : 'medium'
  brand.counters.rule += 1
  const rule = {
    id: 'R-' + String(brand.counters.rule).padStart(2, '0'),
    text, bannedWords, severity,
    safeWording: String(body.safeWording || '').trim().slice(0, 200) || null,
    active: true,
  }
  brand.rules.push(rule)
  brand.version += 1
  await db.save('brands', brand)
  res.json({ brand, added: rule })
})
