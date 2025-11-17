import { header, body, oneOf, validationResult } from 'express-validator'
import { StatusCodes } from 'http-status-codes'

// Valida headers VTEX
export const requireJsonHeaders = [
  // Accept debe incluir application/json (VTEX lo envía)
  header('accept')
    .exists().withMessage('Missing Accept header')
    .bail()
    .custom(v => /application\/json/i.test(v))
    .withMessage('Accept must include application/json'),

  // Content-Type debe ser application/json
  header('content-type')
    .exists().withMessage('Missing Content-Type header')
    .bail()
    .custom(v => /^application\/json\b/i.test(v))
    .withMessage('Content-Type must be application/json'),
]

// Valida el body (estructura de Cart/Fulfillment Simulation de VTEX)
export const validateVtexSimulationBody = [
  body('items')
    .isArray({ min: 1 }).withMessage('items must be a non-empty array'),

  body('items.*.id')
    .exists().withMessage('items[*].id is required')
    .bail()
    .custom(v => ['string','number'].includes(typeof v))
    .withMessage('items[*].id must be string or number'),

  body('items.*.quantity')
    .isInt({ min: 1 }).withMessage('items[*].quantity must be integer >= 1'),

  body('items.*.seller')
    .exists().withMessage('items[*].seller is required')
    .bail()
    .isString().withMessage('items[*].seller must be string'),

  body('postalCode')
    .exists().withMessage('postalCode is required')
    .bail()
    .isString().withMessage('postalCode must be string')
    .bail()
    .notEmpty().withMessage('postalCode cannot be empty'),

  body('country')
    .exists().withMessage('country is required')
    .bail()
    .isString().withMessage('country must be string')
    .bail()
    .custom(v => v.toUpperCase() === 'ARG')
    .withMessage('country must be "ARG"'),

  // sc es opcional, pero si viene debe ser string
  oneOf([
    body('sc').not().exists(),
    body('sc').isString(),
  ], 'sc must be a string if provided'),
]

// Procesa errores de express-validator
export function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      error: { message: 'Validation error', details: errors.array() }
    })
  }
  return next()
}
