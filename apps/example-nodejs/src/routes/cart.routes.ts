import { Router, Request, Response, NextFunction } from 'express'
import { togglebox } from '../config/togglebox'
import { products } from '../data/products'
import { userContextMiddleware } from '../middleware/user-context'
import { logger } from '../config/logger'

const router = Router()
router.use(userContextMiddleware)

/**
 * POST /api/cart/add
 *
 * Analytics: Track custom events
 */
router.post('/add', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.userContext!
    const { productId, quantity = 1 } = req.body

    const product = products.find((p) => p.id === productId)
    if (!product) {
      res.status(404).json({ error: 'Product not found' })
      return
    }

    // Track add to cart event
    togglebox.trackEvent('add_to_cart', context, {
      properties: {
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
        total: product.price * quantity,
      },
    })

    logger.info(
      { userId: context.userId, productId, quantity },
      'Item added to cart'
    )

    res.json({
      success: true,
      item: {
        productId: product.id,
        name: product.name,
        quantity,
        price: product.price,
        total: product.price * quantity,
      },
    })
  } catch (error) {
    next(error)
  }
})

export default router
