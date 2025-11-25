import { Router } from 'express';
import { asyncHandler } from '@togglebox/shared';
import { Container } from '../container';

/**
 * Public router for read-only (GET) endpoints
 * These endpoints are publicly accessible and do not modify state
 */
const publicRouter = Router();

// Create controllers with dependency injection
const configController = Container.createConfigController();
const featureFlagController = Container.createFeatureFlagController();

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
publicRouter.get('/platforms/:platform/environments/:environment/versions/:versionTimestamp', asyncHandler(configController.getVersion));
publicRouter.get('/platforms/:platform/environments/:environment/versions/latest/stable', asyncHandler(configController.getLatestStableVersion));

// ============================================================================
// FEATURE FLAG READ ENDPOINTS
// ============================================================================

publicRouter.get('/platforms/:platform/environments/:environment/feature-flags', asyncHandler(featureFlagController.listFeatureFlags));
publicRouter.get('/platforms/:platform/environments/:environment/feature-flags/:flagName', asyncHandler(featureFlagController.getFeatureFlag));

export { publicRouter };
