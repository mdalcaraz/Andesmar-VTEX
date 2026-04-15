import { Sequelize } from 'sequelize'
import config from '../config/index.js'

// Si DB_INSTANCE está definido conecta por instancia nombrada (SQL Server Browser).
// Si no, conecta por puerto estático (DB_PORT, default 1433).
const dialectOptions = config.db.instance
  ? { options: { encrypt: false, instanceName: config.db.instance } }
  : { options: { encrypt: false, port: config.db.port } }

const sequelize = new Sequelize({
  dialect: 'mssql',
  host: config.db.host,
  port: config.db.instance ? undefined : config.db.port,
  database: config.db.database,
  username: config.db.username,
  password: config.db.password,
  logging: config.db.logging,
  dialectOptions,
})

export default sequelize
