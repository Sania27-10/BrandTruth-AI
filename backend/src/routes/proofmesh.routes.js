import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { getProofMesh } from '../controllers/proofmesh.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', getProofMesh)
export default router
