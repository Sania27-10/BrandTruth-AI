export const DB_NAME = process.env.MONGODB_DB || 'brandtruth'

export const ROLES = { MANAGER: 'manager', CREATOR: 'creator', REVIEWER: 'reviewer' }
export const ALL_ROLES = Object.values(ROLES)

export const STATUS = {
  DRAFT: 'draft',
  WAITING: 'waiting_for_review',
  CHANGES: 'changes_requested',
  APPROVED: 'approved',
}

export const FINDING_STATUS = ['contradicted', 'needs_review', 'supported']
export const FACT_TYPES = ['discount_percent', 'offer_end_date', 'product_name', 'other']
export const SEVERITIES = ['low', 'medium', 'high']

export const MAX_TEXT = 3000
export const MAX_IMAGE_CHARS = 5_000_000
export const RATE_LIMIT = { max: 12, windowMs: 60_000 }
