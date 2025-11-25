/**
 * Routes index - exports public, internal, and auth routers
 *
 * Public routes: Read-only GET endpoints (publicly accessible)
 * Internal routes: Write operations POST/PUT/PATCH/DELETE (should be restricted)
 * Auth routes: Authentication endpoints (conditionally loaded)
 */

export { publicRouter } from './publicRoutes';
export { internalRouter } from './internalRoutes';
export { authRouter } from './authRoutes';
