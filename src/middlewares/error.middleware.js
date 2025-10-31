import { StatusCodes, getReasonPhrase } from 'http-status-codes'

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR
  const message = err.message || getReasonPhrase(status)
  const details = (process.env.NODE_ENV !== 'production' && err.stack) ? err.stack : undefined
  res.status(status).json({ error: { message, status, details } })
}
