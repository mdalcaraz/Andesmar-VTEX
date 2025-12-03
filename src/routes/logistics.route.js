import { Router } from 'express'
import { vtexController } from '../controllers/vtex.controller.js'
import {
  vtexPingMiddleware,
} from '../middlewares/vtexValidators.js'

const router = Router()

// VTEX usa "orderForms", pero soportamos también el typo "orderFroms"
router.post(
  '/vtex/orders/hook',
  // validateVtexOrderHookBody,     
  vtexPingMiddleware,                      
  vtexController.receive         
)

export default router