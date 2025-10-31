import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import routes from './routes/index.js'
import { requestLogger } from './middlewares/logging.middleware.js'
import { apiLimiter } from './middlewares/rateLimit.middleware.js'
import { errorHandler } from './middlewares/error.middleware.js'
import { notFound } from './middlewares/notFound.middleware.js'
import config from './config/index.js'

const app = express()

app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// const corsOrigins = config.corsOrigins.length ? { origin: config.corsOrigins } : {}
// app.use(cors(corsOrigins))

// app.use(requestLogger)
app.use('/api', apiLimiter, routes)

app.use(notFound)
app.use(errorHandler)

export default app
