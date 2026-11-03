export const DB_NAME = process.env.MONGODB_DB || 'brandtruth'

export const ROLES = { MANAGER: 'manager', CREATOR: 'creator', REVIEWER: 'reviewer' }
export const ALL_ROLES = Object.values(ROLES)

export const STATUS = {
  DRAFT: 'draft',
  WAITING: 'waiting_for_review',
  CHANGES: 'changes_requested',
  APPROVED: 'approved',
  REREVIEW: 'needs_rereview',
}

export const FINDING_STATUS = [
  'contradicted',
  'needs_review',
  'supported',
  'accepted',
  'ignored',
  'reverification_required',
  'reverified',
]
export const FACT_TYPES = ['discount_percent', 'offer_end_date', 'offer_scope', 'product_name', 'other']
export const SEVERITIES = ['low', 'medium', 'high', 'critical']
export const RULE_CATEGORIES = ['claims', 'legal', 'tone', 'offer', 'other']

export const SHARED_ORG = 'TAPRI-DEMO'
export const DEMO_PASSWORD = 'chai-tapri'
export const DEMO_ACCOUNTS = [
  { username: 'meera', name: 'Meera', role: 'manager' },
  { username: 'rahul', name: 'Rahul', role: 'creator' },
  { username: 'priya', name: 'Priya', role: 'reviewer' },
]

export const MAX_TEXT = 3000
export const MAX_IMAGE_CHARS = 5_000_000
export const RATE_LIMIT = { max: 12, windowMs: 60_000 }
