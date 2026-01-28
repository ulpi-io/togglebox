import 'dotenv/config'
import { createApp } from './app'
import { env } from './config/env'
import { logger } from './config/logger'
import { togglebox } from './config/togglebox'

async function main() {
  // Initialize ToggleBox client
  try {
    const health = await togglebox.checkConnection()
    logger.info(
      { platform: env.PLATFORM, environment: env.ENVIRONMENT, health },
      'ToggleBox connected'
    )
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'ToggleBox connection check failed - continuing anyway'
    )
  }

  // Create and start Express app
  const app = createApp()

  app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, url: `http://localhost:${env.PORT}` },
      'Product Store API started'
    )
  })

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...')
    await togglebox.flushStats()
    togglebox.destroy()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server')
  process.exit(1)
})
