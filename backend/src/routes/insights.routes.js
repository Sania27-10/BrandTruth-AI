import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { getInsights } from '../controllers/insights.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', getInsights)
export default router
