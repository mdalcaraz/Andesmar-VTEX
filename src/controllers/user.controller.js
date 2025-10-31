import * as service from '../services/user.service.js'

export const userController = {
  list: async (req, res, next) => {
    try {
      const users = await service.listUsers()
      res.json(users)
    } catch (err) { next(err) }
  },
  create: async (req, res, next) => {
    try {
      const user = await service.createUser(req.body)
      res.status(201).json(user)
    } catch (err) { next(err) }
  }
}
