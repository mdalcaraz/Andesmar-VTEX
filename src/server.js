import app from './app.js'
import config from './config/index.js'
import db from './models/index.js'
import './jobs/vtexOrdersReconciliation.job.js';

const port = config.port

async function bootstrap() {
  try {
    await db.sequelize.authenticate()
    
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`))
  } catch (err) {
    console.error('DB connection failed:', err)
    process.exit(1)
  }
}

bootstrap()
