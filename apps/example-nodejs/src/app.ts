import express from 'express'
import { requestLogger } from './middleware/request-logger'
import { errorHandler } from './middleware/error-handler'
import { routes } from './routes'

export function createApp() {
  const app = express()

  // Middleware
  app.use(express.json())
  app.use(requestLogger)

  // Routes
  app.use(routes)

  // Error handler (must be last)
  app.use(errorHandler)

  return app
}
