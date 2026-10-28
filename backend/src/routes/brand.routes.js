import { Router } from 'express'
import { ROLES } from '../constants.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { getBrand, addFact, addRule } from '../controllers/brand.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', getBrand)
router.post('/facts', authorize(ROLES.MANAGER), addFact)
router.post('/rules', authorize(ROLES.MANAGER), addRule)
export default router
