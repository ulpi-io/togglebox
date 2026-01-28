import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'
import { ToggleBoxError } from '@togglebox/sdk'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({ err, path: req.path, method: req.method }, 'Request error')

  if (err instanceof ToggleBoxError) {
    res.status(503).json({
      error: 'Feature service unavailable',
      message: err.message,
    })
    return
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
}
