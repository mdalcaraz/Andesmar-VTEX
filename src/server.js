import app from './app.js'
import config from './config/index.js'
import db from './models/index.js'

const port = config.port

async function bootstrap() {
  try {
    await db.sequelize.authenticate()
    // En dev: sincroniza modelos. En prod, usa migraciones.
    if (config.nodeEnv !== 'production') {
      await db.sequelize.sync({ alter: false })
    }
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`))
  } catch (err) {
    console.error('DB connection failed:', err)
    process.exit(1)
  }
}

bootstrap()
