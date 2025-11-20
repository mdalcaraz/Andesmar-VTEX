import { Router } from 'express'
import { healthController } from '../controllers/health.controller.js'
import vtex from './vtex.route.js'
import logistics from './logistics.route.js'


const router = Router()

router.get('/health', healthController.index)
router.use('/vtex', vtex)
router.use('/logistics', logistics)

export default router
