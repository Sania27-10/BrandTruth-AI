import { Router } from 'express'
import { dbMode } from '../db/index.js'
import { pingGemini } from '../utils/gemini.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import demoRoutes from './demo.routes.js'
import brandRoutes from './brand.routes.js'
import checkRoutes from './check.routes.js'
import submissionRoutes from './submission.routes.js'

const router = Router()

// /api/health          -> is a key configured?
// /api/health?ai=1     -> actually calls Gemini once and shows the real error if it fails
router.get('/health', asyncHandler(async (req, res) => {
  const out = { ok: true, store: dbMode(), ai: !!process.env.GEMINI_API_KEY }
  if (req.query.ai) out.aiTest = await pingGemini()
  res.json(out)
}))
router.use('/demo', demoRoutes)
router.use('/brand', brandRoutes)
router.use('/submissions', submissionRoutes)
router.use('/', checkRoutes)   // /check and /extract
export default router