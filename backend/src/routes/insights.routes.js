import { Router } from 'express'
import { ROLES } from '../constants.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { getInsights } from '../controllers/insights.controller.js'

const router = Router()
router.use(authenticate, authorize(ROLES.MANAGER))
router.get('/', getInsights)
export default router
