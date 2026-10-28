import { ApiError } from '../utils/ApiError.js'

export const apiNotFound = (_req, res) => res.status(404).json({ error: 'Not found' })

// Every error becomes { error: "message" }, which is what the frontend expects.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.message })
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'That upload is too large.' })
  console.error('[error]', err)
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' })
}
