import { ApiError } from '../utils/ApiError.js'
import { RATE_LIMIT } from '../constants.js'

// Per-workspace limit so a demo cannot burn the AI quota.
const hits = new Map()
export function checkRateLimit(req, _res, next) {
  const key = req.user.orgCode
  const t = Date.now()
  const arr = (hits.get(key) || []).filter((x) => t - x < RATE_LIMIT.windowMs)
  if (arr.length >= RATE_LIMIT.max) {
    return next(new ApiError(429, 'Too many checks in a minute. Please wait a few seconds and try again.'))
  }
  arr.push(t)
  hits.set(key, arr)
  next()
}
