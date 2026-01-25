import { Router } from 'express';
import { asyncHandler, requireAuth, requirePermission } from '@togglebox/shared';
import { Container } from '../container';
import {
  UserController,
  UserService,
  ApiKeyController,
  ApiKeyService,
  createAuthRepositories,
  DatabaseType,
  validate,
  createApiKeySchema,
} from '@togglebox/auth';

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
const internalRouter: Router = Router();

// ALWAYS require authentication for internal routes (no conditional logic)
internalRouter.use(requireAuth());

// Map req.user.id to req.user.userId for @togglebox/auth compatibility
// The @togglebox/shared auth middleware sets req.user.id, but @togglebox/auth expects req.user.userId
internalRouter.use((req, _res, next) => {
  const authReq = req as { user?: { id?: string; userId?: string } };
  if (authReq.user && authReq.user.id && !authReq.user.userId) {
    authReq.user.userId = authReq.user.id;
  }
  next();
});

// Create controllers with dependency injection
const configController = Container.createConfigController();
const webhookController = Container.createWebhookController();
const flagController = Container.createFlagController();
const experimentController = Container.createExperimentController();
const statsController = Container.createStatsController();

// Create user and API key controllers for user/apikey management
const dbType = (process.env['DB_TYPE'] || 'dynamodb') as DatabaseType;
const authRepositories = createAuthRepositories(dbType);
const userService = new UserService(authRepositories.user);
const userController = new UserController(userService);
const apiKeyService = new ApiKeyService(authRepositories.apiKey, authRepositories.user);
const apiKeyController = new ApiKeyController(apiKeyService);

// ============================================================================
// PLATFORM WRITE ENDPOINTS
// ============================================================================

internalRouter.post('/platforms',
  requirePermission('config:write'),
  asyncHandler(configController.createPlatform)
);

internalRouter.delete('/platforms/:platform',
  requirePermission('config:delete'),
  asyncHandler(configController.deletePlatform)
);

// ============================================================================
// ENVIRONMENT WRITE ENDPOINTS
// ============================================================================

internalRouter.post('/platforms/:platform/environments',
  requirePermission('config:write'),
  asyncHandler(configController.createEnvironment)
);

internalRouter.delete('/platforms/:platform/environments/:environment',
  requirePermission('config:delete'),
  asyncHandler(configController.deleteEnvironment)
);

// ============================================================================
// CONFIG VERSION WRITE ENDPOINTS
// ============================================================================

internalRouter.post('/platforms/:platform/environments/:environment/versions',
  requirePermission('config:write'),
  asyncHandler(configController.createVersion)
);

internalRouter.delete('/platforms/:platform/environments/:environment/versions/:version',
  requirePermission('config:delete'),
  asyncHandler(configController.deleteVersion)
);

internalRouter.patch('/platforms/:platform/environments/:environment/versions/:version/mark-stable',
  requirePermission('config:write'),
  asyncHandler(configController.markVersionStable)
);

// ============================================================================
// CACHE INVALIDATION ENDPOINTS
// ============================================================================

internalRouter.post('/cache/invalidate',
  requirePermission('cache:invalidate'),
  asyncHandler(configController.invalidateCache)
);

internalRouter.post('/cache/invalidate-all',
  requirePermission('cache:invalidate'),
  asyncHandler(configController.invalidateAllCache)
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

// ============================================================================
// USER MANAGEMENT ENDPOINTS (Admin only)
// ============================================================================

/**
 * User management endpoints require admin permission (user:manage)
 * These are internal-only endpoints for managing users
 */

internalRouter.post('/users',
  requirePermission('user:manage'),
  asyncHandler(userController.createUser)
);

internalRouter.get('/users',
  requirePermission('user:manage'),
  asyncHandler(userController.listUsers)
);

internalRouter.get('/users/:id',
  requirePermission('user:manage'),
  asyncHandler(userController.getUserById)
);

internalRouter.delete('/users/:id',
  requirePermission('user:manage'),
  asyncHandler(userController.deleteUser)
);

internalRouter.patch('/users/:id/role',
  requirePermission('user:manage'),
  asyncHandler(userController.updateUserRole)
);

// ============================================================================
// API KEY MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * API key management endpoints
 * Users can manage their own API keys (apikey:manage permission)
 */

internalRouter.get('/api-keys',
  requirePermission('apikey:manage'),
  asyncHandler(apiKeyController.listApiKeys)
);

internalRouter.post('/api-keys',
  requirePermission('apikey:manage'),
  validate(createApiKeySchema),
  asyncHandler(apiKeyController.createApiKey)
);

internalRouter.get('/api-keys/:id',
  requirePermission('apikey:manage'),
  asyncHandler(apiKeyController.getApiKey)
);

internalRouter.delete('/api-keys/:id',
  requirePermission('apikey:manage'),
  asyncHandler(apiKeyController.revokeApiKey)
);

// ============================================================================
// FLAG WRITE ENDPOINTS (Tier 2: 2-value model)
// ============================================================================

// Create new feature flag
internalRouter.post('/platforms/:platform/environments/:environment/flags',
  requirePermission('config:write'),
  asyncHandler(flagController.createFlag)
);

// Update feature flag (creates new version)
internalRouter.put('/platforms/:platform/environments/:environment/flags/:flagKey',
  requirePermission('config:write'),
  asyncHandler(flagController.updateFlag)
);

// Toggle flag enabled state (in-place update)
internalRouter.patch('/platforms/:platform/environments/:environment/flags/:flagKey/toggle',
  requirePermission('config:write'),
  asyncHandler(flagController.toggleFlag)
);

// Update rollout settings (in-place update, no new version)
internalRouter.patch('/platforms/:platform/environments/:environment/flags/:flagKey/rollout',
  requirePermission('config:write'),
  asyncHandler(flagController.updateRolloutSettings)
);

// List all versions of a flag
internalRouter.get('/platforms/:platform/environments/:environment/flags/:flagKey/versions',
  requirePermission('config:read'),
  asyncHandler(flagController.listFlagVersions)
);

// Get specific version of a flag
internalRouter.get('/platforms/:platform/environments/:environment/flags/:flagKey/versions/:version',
  requirePermission('config:read'),
  asyncHandler(flagController.getFlagVersion)
);

// Delete flag (all versions)
internalRouter.delete('/platforms/:platform/environments/:environment/flags/:flagKey',
  requirePermission('config:delete'),
  asyncHandler(flagController.deleteFlag)
);

// Evaluate flag (POST with context body)
internalRouter.post('/platforms/:platform/environments/:environment/flags/:flagKey/evaluate',
  requirePermission('config:read'),
  asyncHandler(flagController.evaluateFlag)
);

// ============================================================================
// EXPERIMENT WRITE ENDPOINTS
// ============================================================================

// Create experiment (draft status)
internalRouter.post('/platforms/:platform/environments/:environment/experiments',
  requirePermission('config:write'),
  asyncHandler(experimentController.createExperiment)
);

// Update experiment (draft only)
internalRouter.put('/platforms/:platform/environments/:environment/experiments/:experimentKey',
  requirePermission('config:write'),
  asyncHandler(experimentController.updateExperiment)
);

// Start experiment (draft → running)
internalRouter.post('/platforms/:platform/environments/:environment/experiments/:experimentKey/start',
  requirePermission('config:write'),
  asyncHandler(experimentController.startExperiment)
);

// Pause experiment (running → paused)
internalRouter.post('/platforms/:platform/environments/:environment/experiments/:experimentKey/pause',
  requirePermission('config:write'),
  asyncHandler(experimentController.pauseExperiment)
);

// Resume experiment (paused → running)
internalRouter.post('/platforms/:platform/environments/:environment/experiments/:experimentKey/resume',
  requirePermission('config:write'),
  asyncHandler(experimentController.resumeExperiment)
);

// Complete experiment (running/paused → completed)
internalRouter.post('/platforms/:platform/environments/:environment/experiments/:experimentKey/complete',
  requirePermission('config:write'),
  asyncHandler(experimentController.completeExperiment)
);

// Archive experiment (completed → archived)
internalRouter.post('/platforms/:platform/environments/:environment/experiments/:experimentKey/archive',
  requirePermission('config:write'),
  asyncHandler(experimentController.archiveExperiment)
);

// Delete experiment
internalRouter.delete('/platforms/:platform/environments/:environment/experiments/:experimentKey',
  requirePermission('config:delete'),
  asyncHandler(experimentController.deleteExperiment)
);

// Assign variation (POST with context body)
internalRouter.post('/platforms/:platform/environments/:environment/experiments/:experimentKey/assign',
  requirePermission('config:read'),
  asyncHandler(experimentController.assignVariation)
);

// Get experiment results with statistical analysis
internalRouter.get('/platforms/:platform/environments/:environment/experiments/:experimentKey/results',
  requirePermission('config:read'),
  asyncHandler(experimentController.getExperimentResults)
);

// ============================================================================
// STATS ENDPOINTS
// ============================================================================

// Get config stats
internalRouter.get('/platforms/:platform/environments/:environment/configs/:configKey/stats',
  requirePermission('config:read'),
  asyncHandler(statsController.getConfigStats)
);

// Get flag stats
internalRouter.get('/platforms/:platform/environments/:environment/flags/:flagKey/stats',
  requirePermission('config:read'),
  asyncHandler(statsController.getFlagStats)
);

// Get flag stats by country
internalRouter.get('/platforms/:platform/environments/:environment/flags/:flagKey/stats/by-country',
  requirePermission('config:read'),
  asyncHandler(statsController.getFlagStatsByCountry)
);

// Get flag stats daily time series
internalRouter.get('/platforms/:platform/environments/:environment/flags/:flagKey/stats/daily',
  requirePermission('config:read'),
  asyncHandler(statsController.getFlagStatsDaily)
);

// Get experiment stats
internalRouter.get('/platforms/:platform/environments/:environment/experiments/:experimentKey/stats',
  requirePermission('config:read'),
  asyncHandler(statsController.getExperimentStats)
);

// Record conversion event
internalRouter.post('/platforms/:platform/environments/:environment/experiments/:experimentKey/conversions',
  requirePermission('config:write'),
  asyncHandler(statsController.recordConversion)
);

export { internalRouter };
