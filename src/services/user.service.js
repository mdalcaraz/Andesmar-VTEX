import db from '../models/index.js'

export async function listUsers() {
  return db.User.findAll({ order: [['id', 'ASC']] })
}

export async function createUser(payload) {
  return db.User.create(payload)
}
