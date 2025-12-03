import { Router } from 'express'
import { vtexController } from '../controllers/vtex.controller.js'
import {
  validateVtexOrderHookBody,
  validate,
} from '../middlewares/vtexValidators.js'

const router = Router()

// VTEX usa "orderForms", pero soportamos también el typo "orderFroms"
router.post(
  '/vtex/orders/hook',
  // validateVtexOrderHookBody,     
  // validate,                      
  vtexController.receive         
)

export default router