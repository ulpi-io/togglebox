import { Router } from 'express';
import { asyncHandler, requireAuth, requirePermission } from '@togglebox/shared';
import { Container } from '../container';

/**
 * Internal router for write operations (POST/PUT/PATCH/DELETE)
 * These endpoints modify system state and are ALWAYS protected.
 *
 * SECURITY: All internal routes require authentication (JWT or API key).
 * This is non-negotiable and cannot be disabled via environment variables.
 *
 * Authentication methods:
 *   - JWT Token: Authorization: Bearer <token>
 *   - API Key: X-API-Key: <key>
 */
const internalRouter = Router();

// ALWAYS require authentication for internal routes (no conditional logic)
internalRouter.use(requireAuth());

// Create controllers with dependency injection
const configController = Container.createConfigController();
const featureFlagController = Container.createFeatureFlagController();
const webhookController = Container.createWebhookController();

// ============================================================================
// PLATFORM WRITE ENDPOINTS
// ============================================================================

internalRouter.post('/platforms',
  requirePermission('config:write'),
  asyncHandler(configController.createPlatform)
);

// ============================================================================
// ENVIRONMENT WRITE ENDPOINTS
// ============================================================================

internalRouter.post('/platforms/:platform/environments',
  requirePermission('config:write'),
  asyncHandler(configController.createEnvironment)
);

// ============================================================================
// CONFIG VERSION WRITE ENDPOINTS
// ============================================================================

internalRouter.post('/platforms/:platform/environments/:environment/versions',
  requirePermission('config:write'),
  asyncHandler(configController.createVersion)
);

internalRouter.delete('/platforms/:platform/environments/:environment/versions/:versionTimestamp',
  requirePermission('config:delete'),
  asyncHandler(configController.deleteVersion)
);

// ============================================================================
// FEATURE FLAG WRITE ENDPOINTS
// ============================================================================

internalRouter.post('/platforms/:platform/environments/:environment/feature-flags',
  requirePermission('config:write'),
  asyncHandler(featureFlagController.createFeatureFlag)
);

internalRouter.put('/platforms/:platform/environments/:environment/feature-flags/:flagName',
  requirePermission('config:update'),
  asyncHandler(featureFlagController.updateFeatureFlag)
);

internalRouter.delete('/platforms/:platform/environments/:environment/feature-flags/:flagName',
  requirePermission('config:delete'),
  asyncHandler(featureFlagController.deleteFeatureFlag)
);

internalRouter.patch('/platforms/:platform/environments/:environment/feature-flags/:flagName/toggle',
  requirePermission('config:update'),
  asyncHandler(featureFlagController.toggleFeatureFlag)
);

// ============================================================================
// FEATURE FLAG EVALUATION ENDPOINTS
// ============================================================================

/**
 * Evaluation endpoints use POST to accept request body (userId, country, language)
 * but are read-only operations that don't modify state
 */
internalRouter.post('/platforms/:platform/environments/:environment/feature-flags/evaluate',
  requirePermission('config:read'),
  asyncHandler(featureFlagController.evaluateAllFeatureFlags)
);

internalRouter.post('/platforms/:platform/environments/:environment/feature-flags/:flagName/evaluate',
  requirePermission('config:read'),
  asyncHandler(featureFlagController.evaluateSingleFeatureFlag)
);

// ============================================================================
// CACHE INVALIDATION ENDPOINTS
// ============================================================================

internalRouter.post('/cache/invalidate',
  requirePermission('cache:invalidate'),
  asyncHandler(configController.invalidateCache)
);

/**
 * Webhook endpoint for cache invalidation (GET method for CI/CD compatibility)
 *
 * Note: Uses GET for compatibility with CI/CD systems that only support URL-based triggers.
 * While this violates HTTP semantics (GET shouldn't mutate), it's required for some webhook systems.
 */
internalRouter.get('/webhook/cache/invalidate',
  requirePermission('cache:invalidate'),
  asyncHandler(webhookController.invalidateCache)
);

// ============================================================================
// CACHE INVALIDATION STATUS ENDPOINTS
// ============================================================================

/**
 * Monitoring/debugging endpoints for cache invalidation operations
 * These expose internal CloudFront invalidation details and should be restricted
 */
internalRouter.get('/webhook/cache/invalidations/:invalidationId',
  requirePermission('config:read'),
  asyncHandler(webhookController.getInvalidationStatus)
);

internalRouter.get('/webhook/cache/invalidations',
  requirePermission('config:read'),
  asyncHandler(webhookController.listInvalidations)
);

export { internalRouter };
