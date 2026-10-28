import * as db from '../db/index.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// Reads "Authorization: Bearer <token>", finds the demo user, attaches it as req.user.
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const user = token ? (await db.find('users', { token }))[0] : null
  if (!user) throw new ApiError(401, 'Session expired')
  req.user = user
  next()
})

// Usage: router.post('/x', authenticate, authorize(ROLES.MANAGER), controller)
export const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, `The ${req.user.role} role is not allowed to do this. Switch role at the top right.`))
  }
  next()
}
