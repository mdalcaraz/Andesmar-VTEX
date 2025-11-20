import sequelize from '../db/sequelize.js'
import ClienteVtex from './ClienteVtex.js'
import PedidosDesdeVtex from './pedidosDesdeVtex.js'

const db = {};
db.sequelize = sequelize;

db.ClienteVtex = ClienteVtex;
db.PedidosDesdeVtex = PedidosDesdeVtex;

// Associations here if needed
// e.g., db.Post.belongsTo(db.User)

export default db
