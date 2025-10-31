import { Router } from 'express'
import { healthController } from '../controllers/health.controller.js'
import { vtex } from '../controllers/vtex.controller.js'

const router = Router()

router.get('/health', healthController.index)
router.post('/pvt/orderFroms/simulation', vtex.getPrice)

export default router
