import { Router } from 'express'
import { body } from 'express-validator'
import { validate } from '../middlewares/validate.middleware.js'
import { userController } from '../controllers/user.controller.js'

const router = Router()

router.get('/', userController.list)

router.post('/',
  body('email').isEmail().withMessage('Email inválido'),
  body('name').isString().notEmpty(),
  body('role').optional().isIn(['admin', 'user']),
  validate,
  userController.create
)

export default router
