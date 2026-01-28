import { Router, Request, Response, NextFunction } from 'express'
import { togglebox } from '../config/togglebox'
import { logger } from '../config/logger'

const router = Router()

/**
 * GET /api/store/config
 *
 * Tier 1: Remote Configs - Same values for everyone
 * Use for: Store settings, pricing, feature limits, branding
 */
router.get('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get entire config object
    const config = await togglebox.getConfig()

    // Or get specific values with defaults
    const storeName = await togglebox.getConfigValue('storeName', 'My Store')
    const currency = await togglebox.getConfigValue('currency', 'USD')
    const taxRate = await togglebox.getConfigValue('taxRate', 0.08)
    const freeShippingThreshold = await togglebox.getConfigValue(
      'freeShippingThreshold',
      50
    )

    logger.info({ storeName, currency }, 'Store config fetched')

    res.json({
      store: {
        name: storeName,
        currency,
        taxRate,
        freeShippingThreshold,
      },
      _raw: config, // Full config for debugging
    })
  } catch (error) {
    next(error)
  }
})

export default router
