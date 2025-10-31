import { Sequelize } from 'sequelize'
import config from '../config/index.js'

const sequelize = new Sequelize({
  dialect: 'mssql',
  dialectModule: undefined, // `tedious` is auto-picked by Sequelize for mssql
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  username: config.db.username,
  password: config.db.password,
  logging: config.db.logging,
  dialectOptions: {
    options: { encrypt: false } // Ajusta según tu SQL Server (Azure: true)
  }
})

export default sequelize
