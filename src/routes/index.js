import { Router } from 'express'
import { healthController } from '../controllers/health.controller.js'
import users from './users.route.js'

const router = Router()

router.get('/health', healthController.index)
router.use('/users', users)

export default router
