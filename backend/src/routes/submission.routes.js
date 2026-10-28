import { Router } from 'express'
import { ROLES } from '../constants.js'
import { authenticate, authorize } from '../middlewares/auth.middleware.js'
import * as c from '../controllers/submission.controller.js'

const router = Router()
router.use(authenticate)
router.post('/', authorize(ROLES.CREATOR), c.createSubmission)
router.get('/', c.listSubmissions)
router.get('/:id', c.getSubmission)
router.post('/:id/submit', authorize(ROLES.CREATOR), c.submitForReview)
router.post('/:id/resubmit', authorize(ROLES.CREATOR), c.resubmit)
router.post('/:id/comments', c.addComment)
router.post('/:id/approve', authorize(ROLES.REVIEWER), c.approve)
router.post('/:id/request-changes', authorize(ROLES.REVIEWER), c.requestChanges)
export default router
