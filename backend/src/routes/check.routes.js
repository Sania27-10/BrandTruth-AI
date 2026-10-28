import { Router } from 'express'
import { ROLES } from '../constants.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { checkRateLimit } from '../middlewares/rateLimit.middleware.js'
import { runCheck, extractText } from '../controllers/check.controller.js'

const router = Router()
const creatorOnly = [authenticate, authorize(ROLES.CREATOR), checkRateLimit]
router.post('/check', ...creatorOnly, runCheck)
router.post('/extract', ...creatorOnly, extractText)
export default router
