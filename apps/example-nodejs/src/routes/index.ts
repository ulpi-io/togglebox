import { Router } from 'express'
import healthRoutes from './health.routes'
import storeRoutes from './store.routes'
import productsRoutes from './products.routes'
import cartRoutes from './cart.routes'
import checkoutRoutes from './checkout.routes'

export const routes = Router()

// Health checks (no prefix)
routes.use('/health', healthRoutes)
routes.use('/ready', healthRoutes)

// API routes
routes.use('/api/store', storeRoutes)
routes.use('/api/products', productsRoutes)
routes.use('/api/cart', cartRoutes)
routes.use('/api/checkout', checkoutRoutes)
