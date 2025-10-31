import sequelize from '../db/sequelize.js'

const db = {}
db.sequelize = sequelize

// Associations here if needed
// e.g., db.Post.belongsTo(db.User)

export default db
