import sequelize from '../db/sequelize.js'
import User from './user.model.js'

const db = {}
db.sequelize = sequelize
db.User = User(sequelize)

// Associations here if needed
// e.g., db.Post.belongsTo(db.User)

export default db
