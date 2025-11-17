import { Router } from 'express'
import { vtexController } from '../controllers/vtex.controller.js'
import {
  requireJsonHeaders,
  validateVtexSimulationBody,
  validate,
} from '../middlewares/vtexValidators.js'

const router = Router()

// VTEX usa "orderForms", pero soportamos también el typo "orderFroms"
router.post(
  ['/pvt/orderForms/simulation', '/pvt/orderFroms/simulation'],
  requireJsonHeaders,            // valida Accept / Content-Type
  validateVtexSimulationBody,    // valida body
  validate,                      // procesa errores de express-validator
  vtexController.getPrice        // genera la respuesta VTEX-compliant
)

export default router
