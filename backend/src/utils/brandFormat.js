const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function prettyDate(value) {
  const raw = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const [, mm, dd] = raw.split('-').map(Number)
  return `${dd} ${MONTHS[mm - 1]}`
}

export function displayValue(fact) {
  if (!fact) return ''
  if (fact.type === 'offer_scope') return fact.value?.approved || ''
  if (fact.type === 'discount_percent') return String(fact.value) + '%'
  if (fact.type === 'offer_end_date') return prettyDate(fact.value)
  return String(fact.value ?? '')
}

export function describeValue(fact) {
  return displayValue(fact)
}

export function defaultNote(type, value) {
  if (type === 'discount_percent') return `Approved discount is ${value}%`
  if (type === 'offer_end_date') return `Offer ends ${prettyDate(value)}`
  if (type === 'offer_scope') {
    const approved = value && typeof value === 'object' ? value.approved : value
    return `Offer applies to ${approved} only`
  }
  if (type === 'product_name') return `Approved product name: ${value}`
  return String(value ?? '')
}

export function stampFact(fact, extra = {}) {
  const t = extra.updatedAt || new Date().toISOString()
  return {
    previousValue: extra.previousValue ?? fact.previousValue ?? null,
    version: extra.version ?? fact.version ?? 1,
    createdAt: fact.createdAt || t,
    updatedAt: t,
    modifiedBy: extra.modifiedBy ?? fact.modifiedBy ?? null,
    source: extra.source !== undefined ? extra.source : (fact.source || null),
    description: extra.description !== undefined ? extra.description : (fact.description || ''),
    effectiveDate: extra.effectiveDate !== undefined ? extra.effectiveDate : (fact.effectiveDate || null),
    versions: Array.isArray(fact.versions) ? fact.versions : [],
    active: fact.active !== false,
    ...fact,
    ...extra,
    updatedAt: t,
  }
}

export function stampRule(rule, extra = {}) {
  const t = extra.updatedAt || new Date().toISOString()
  return {
    version: extra.version ?? rule.version ?? 1,
    category: extra.category ?? rule.category ?? 'claims',
    explanation: extra.explanation !== undefined ? extra.explanation : (rule.explanation || ''),
    versions: Array.isArray(rule.versions) ? rule.versions : [],
    createdAt: rule.createdAt || t,
    updatedAt: t,
    modifiedBy: extra.modifiedBy ?? rule.modifiedBy ?? null,
    active: rule.active !== false,
    ...rule,
    ...extra,
    updatedAt: t,
  }
}
