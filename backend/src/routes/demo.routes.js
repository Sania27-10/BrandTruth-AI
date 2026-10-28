import { Router } from 'express'
import { startDemo } from '../controllers/demo.controller.js'

const router = Router()
router.post('/start', startDemo)
export default router
