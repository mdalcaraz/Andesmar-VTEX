import { StatusCodes } from 'http-status-codes'
export function notFound(req, res) {
  res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Route not found' } })
}
