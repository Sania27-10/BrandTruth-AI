import { Router } from 'express'
import { ROLES } from '../constants.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import { getProofMesh } from '../controllers/proofmesh.controller.js'

const router = Router()
router.use(authenticate, authorize(ROLES.MANAGER))
router.get('/', getProofMesh)
export default router
