import { Router } from 'express'
import { ROLES } from '../constants.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { getBrand, addFact, addRule, updateFact, updateRule, previewFactChange, getAsset, updateAsset, reverifyAsset } from '../controllers/brand.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', getBrand)
router.post('/facts', authorize(ROLES.MANAGER), addFact)
router.post('/facts/:id/preview', authorize(ROLES.MANAGER), previewFactChange)
router.patch('/facts/:id', authorize(ROLES.MANAGER), updateFact)
router.post('/rules', authorize(ROLES.MANAGER), addRule)
router.patch('/rules/:id', authorize(ROLES.MANAGER), updateRule)
router.get('/assets/:id', getAsset)
router.patch('/assets/:id', authorize(ROLES.MANAGER), updateAsset)
router.post('/assets/:id/reverify', authorize(ROLES.MANAGER), reverifyAsset)
export default router
