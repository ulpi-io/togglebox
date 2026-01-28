import { ToggleBoxClient } from '@togglebox/sdk'
import { env } from './env'
import { logger } from './logger'

export const togglebox = new ToggleBoxClient({
  platform: env.PLATFORM,
  environment: env.ENVIRONMENT,
  apiUrl: env.TOGGLEBOX_API_URL,
  apiKey: env.TOGGLEBOX_API_KEY,
  pollingInterval: 30000, // Refresh every 30s
  cache: {
    enabled: true,
    ttl: 60000, // 1 minute cache
  },
})

// Log SDK events
togglebox.on('update', () => logger.debug('ToggleBox data refreshed'))
togglebox.on('error', (err) => logger.error({ err }, 'ToggleBox error'))
