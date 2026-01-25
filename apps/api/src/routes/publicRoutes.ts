import { Router } from 'express';
import { asyncHandler } from '@togglebox/shared';
import { Container } from '../container';

/**
 * Public router for read-only (GET) endpoints
 * These endpoints are publicly accessible and do not modify state
 */
const publicRouter: Router = Router();

// Create controllers with dependency injection
const configController = Container.createConfigController();
const flagController = Container.createFlagController();
const experimentController = Container.createExperimentController();
const statsController = Container.createStatsController();

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Health check endpoint
 * Returns service status and uptime
 */
publicRouter.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Config Service is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================================
// PLATFORM READ ENDPOINTS
// ============================================================================

publicRouter.get('/platforms', asyncHandler(configController.listPlatforms));
publicRouter.get('/platforms/:name', asyncHandler(configController.getPlatform));

// ============================================================================
// ENVIRONMENT READ ENDPOINTS
// ============================================================================

publicRouter.get('/platforms/:platform/environments', asyncHandler(configController.listEnvironments));
publicRouter.get('/platforms/:platform/environments/:environment', asyncHandler(configController.getEnvironment));

// ============================================================================
// CONFIG VERSION READ ENDPOINTS
// ============================================================================

publicRouter.get('/platforms/:platform/environments/:environment/versions', asyncHandler(configController.listVersions));
publicRouter.get('/platforms/:platform/environments/:environment/versions/latest/stable', asyncHandler(configController.getLatestStableVersion));
publicRouter.get('/platforms/:platform/environments/:environment/versions/:version', asyncHandler(configController.getVersion));

// ============================================================================
// FLAG READ ENDPOINTS (Tier 2: 2-value model)
// ============================================================================

publicRouter.get('/platforms/:platform/environments/:environment/flags', asyncHandler(flagController.listFlags));

/**
 * Public GET endpoint for evaluating a feature flag.
 * Context passed via query parameters: userId, country, language
 *
 * Example: GET /platforms/web/environments/production/flags/dark_mode/evaluate?userId=user123
 *
 * NOTE: This route MUST come before /:flagKey to avoid "evaluate" being matched as a flag key
 */
publicRouter.get('/platforms/:platform/environments/:environment/flags/:flagKey/evaluate', asyncHandler(flagController.evaluateFlagPublic));

publicRouter.get('/platforms/:platform/environments/:environment/flags/:flagKey', asyncHandler(flagController.getFlag));

// ============================================================================
// EXPERIMENT READ ENDPOINTS
// ============================================================================

publicRouter.get('/platforms/:platform/environments/:environment/experiments', asyncHandler(experimentController.listExperiments));

/**
 * Public GET endpoint for assigning a user to an experiment variation.
 * Context passed via query parameters: userId, country, language
 *
 * Example: GET /platforms/web/environments/production/experiments/checkout-test/assign?userId=user123
 *
 * NOTE: This route MUST come before /:experimentKey to avoid "assign" being matched as an experiment key
 */
publicRouter.get('/platforms/:platform/environments/:environment/experiments/:experimentKey/assign', asyncHandler(experimentController.assignVariationPublic));

publicRouter.get('/platforms/:platform/environments/:environment/experiments/:experimentKey', asyncHandler(experimentController.getExperiment));

// ============================================================================
// STATS EVENT INGESTION (SDK events)
// ============================================================================

/**
 * Batch event ingestion endpoint for SDK stats reporting.
 * Accepts config fetches, flag evaluations, experiment exposures, and conversions.
 */
publicRouter.post('/platforms/:platform/environments/:environment/stats/events', asyncHandler(statsController.processBatch));

export { publicRouter };
