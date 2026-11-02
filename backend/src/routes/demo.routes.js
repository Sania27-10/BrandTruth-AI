import { Router } from 'express'
import { startDemo, loginDemo, demoInfo } from '../controllers/demo.controller.js'

const router = Router()
router.get('/info', demoInfo)
router.post('/start', startDemo)
router.post('/login', loginDemo)
export default router
