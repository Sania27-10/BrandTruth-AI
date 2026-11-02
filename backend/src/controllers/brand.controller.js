import * as db from '../db/index.js'
import { FACT_TYPES, SEVERITIES } from '../constants.js'
import { badRequest, ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { applyFactChange } from './proofmesh.controller.js'

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

function defaultNote(type, value) {
  if (type === 'discount_percent') return `Approved discount is ${value}%`
  if (type === 'offer_end_date') return `Offer ends ${value}`
  if (type === 'offer_scope') return `Offer applies to ${value.approved} only`
  if (type === 'product_name') return `Approved product name: ${value}`
  return String(value)
}

function displayValue(fact) {
  if (fact.type === 'offer_scope') return fact.value?.approved || ''
  return String(fact.value)
}

export const getBrand = asyncHandler(async (req, res) => {
  res.json(await loadBrand(req.user))
})

export const addFact = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const body = req.body || {}
  const type = String(body.type || '')
  if (!FACT_TYPES.includes(type)) throw badRequest('Choose a fact type.')
  const value = parseFactValue(type, body.value)
  const text = String(body.text || '').trim().slice(0, 200) || defaultNote(type, value)
  brand.counters.fact += 1
  const fact = { id: 'F-' + String(brand.counters.fact).padStart(2, '0'), type, value, text, active: true }
  brand.facts.push(fact)
  brand.version += 1
  await db.save('brands', brand)
  res.json({ brand, added: fact })
})

export const updateFact = asyncHandler(async (req, res) => {
  const brand = await loadBrand(req.user)
  const fact = (brand.facts || []).find((f) => f.id === req.params.id)
  if (!fact) throw badRequest('That fact is not in this brand library.')
  const body = req.body || {}
  const previous = displayValue(fact)
  if (body.value !== undefined) fact.value = parseFactValue(fact.type, body.value)
  if (body.text !== undefined) {
    const note = String(body.text || '').trim().slice(0, 200)
    if (note) fact.text = note
    else fact.text = defaultNote(fact.type, fact.value)
  } else {
    fact.text = defaultNote(fact.type, fact.value)
  }
  brand.version += 1
  await db.save('brands', brand)
  const impact = await applyFactChange(req.user, brand, fact, previous)
  res.json({ brand, updated: fact, impact })
})

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
