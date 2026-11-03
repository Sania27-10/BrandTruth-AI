import { Router } from 'express'
import { authenticate } from '../middlewares/auth.middleware.js'
import { listNotifications, markRead, markAllRead } from '../controllers/notify.controller.js'

const router = Router()
router.use(authenticate)
router.get('/', listNotifications)
router.post('/read-all', markAllRead)
router.post('/:id/read', markRead)
export default router
