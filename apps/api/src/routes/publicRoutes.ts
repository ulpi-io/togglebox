import { Router } from "express";
import { asyncHandler } from "@togglebox/shared";
import { authMiddleware } from "../authMiddleware";
import { Container } from "../container";

/**
 * Public router for read-only (GET) endpoints
 *
 * These endpoints serve configuration data to SDK clients. Authentication behavior
 * depends on the ENABLE_AUTHENTICATION environment variable:
 *
 * - ENABLE_AUTHENTICATION=false (default): No authentication required
 *   Use this for VPC-isolated deployments with network-level security.
 *
 * - ENABLE_AUTHENTICATION=true: Requires JWT token or API key
 *   Use this for public deployments (Cloudflare Workers, public Docker, etc.)
 *   SDK clients should provide: X-API-Key: <api-key>
 *
 * NOTE: Health check endpoint (/health) is ALWAYS unauthenticated for monitoring.
 */
const publicRouter: Router = Router();

// Create controllers with dependency injection
const configController = Container.createConfigController();
const flagController = Container.createFlagController();
const experimentController = Container.createExperimentController();
const statsController = Container.createStatsController();

// ============================================================================
// HEALTH CHECK (always unauthenticated for monitoring/load balancers)
// ============================================================================

/**
 * Health check endpoint
 * Returns service status and uptime
 *
 * NOTE: This endpoint is intentionally NOT protected by authentication
 * to allow load balancers and monitoring systems to check service health.
 */
publicRouter.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Config Service is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================================
// CONDITIONAL AUTHENTICATION
// ============================================================================

/**
 * Apply conditional authentication to all routes below this point.
 *
 * When ENABLE_AUTHENTICATION=true:
 *   - Requires valid JWT token (Authorization: Bearer <token>)
 *   - OR valid API key (X-API-Key: <api-key>)
 *
 * When ENABLE_AUTHENTICATION=false:
 *   - No authentication required (relies on network-level security)
 */
publicRouter.use(authMiddleware.conditionalAuth());

// ============================================================================
// PLATFORM READ ENDPOINTS
// ============================================================================

publicRouter.get("/platforms", asyncHandler(configController.listPlatforms));
publicRouter.get(
  "/platforms/:name",
  asyncHandler(configController.getPlatform),
);

// ============================================================================
// ENVIRONMENT READ ENDPOINTS
// ============================================================================

publicRouter.get(
  "/platforms/:platform/environments",
  asyncHandler(configController.listEnvironments),
);
publicRouter.get(
  "/platforms/:platform/environments/:environment",
  asyncHandler(configController.getEnvironment),
);

// ============================================================================
// CONFIG PARAMETER READ ENDPOINTS (Tier 1: Firebase-style individual parameters)
// ============================================================================

/**
 * SDK endpoint: Get all active config parameters as key-value object
 * Returns: { parameterKey: value, ... } with values parsed by type
 *
 * Example response: { "storeName": "My Store", "maxItems": 100, "isDark": true }
 */
publicRouter.get(
  "/platforms/:platform/environments/:environment/configs",
  asyncHandler(configController.getConfigs),
);

/**
 * List all active config parameters with metadata
 * Returns paginated list with full parameter details (for admin UI)
 *
 * NOTE: This route MUST come before /:parameterKey to avoid "list" being matched as a parameter key
 */
publicRouter.get(
  "/platforms/:platform/environments/:environment/configs/list",
  asyncHandler(configController.listConfigParameters),
);

/**
 * Count active config parameters in an environment
 * Returns: { count: number }
 *
 * NOTE: This route MUST come before /:parameterKey to avoid "count" being matched as a parameter key
 */
publicRouter.get(
  "/platforms/:platform/environments/:environment/configs/count",
  asyncHandler(configController.countConfigParameters),
);

/**
 * List all versions of a config parameter (version history)
 * Returns array of all versions for the parameter
 *
 * NOTE: This route MUST come before /:parameterKey to avoid "versions" being matched incorrectly
 */
publicRouter.get(
  "/platforms/:platform/environments/:environment/configs/:parameterKey/versions",
  asyncHandler(configController.listConfigParameterVersions),
);

/**
 * Get active version of a specific config parameter
 * Returns full parameter metadata including version, type, description
 */
publicRouter.get(
  "/platforms/:platform/environments/:environment/configs/:parameterKey",
  asyncHandler(configController.getConfigParameter),
);

// ============================================================================
// FLAG READ ENDPOINTS (Tier 2: 2-value model)
// ============================================================================

publicRouter.get(
  "/platforms/:platform/environments/:environment/flags",
  asyncHandler(flagController.listFlags),
);

/**
 * Public GET endpoint for evaluating a feature flag.
 * Context passed via query parameters: userId, country, language
 *
 * Example: GET /platforms/web/environments/production/flags/dark_mode/evaluate?userId=user123
 *
 * NOTE: This route MUST come before /:flagKey to avoid "evaluate" being matched as a flag key
 */
publicRouter.get(
  "/platforms/:platform/environments/:environment/flags/:flagKey/evaluate",
  asyncHandler(flagController.evaluateFlagPublic),
);

publicRouter.get(
  "/platforms/:platform/environments/:environment/flags/:flagKey",
  asyncHandler(flagController.getFlag),
);

// ============================================================================
// EXPERIMENT READ ENDPOINTS
// ============================================================================

publicRouter.get(
  "/platforms/:platform/environments/:environment/experiments",
  asyncHandler(experimentController.listExperiments),
);

/**
 * Public GET endpoint for assigning a user to an experiment variation.
 * Context passed via query parameters: userId, country, language
 *
 * Example: GET /platforms/web/environments/production/experiments/checkout-test/assign?userId=user123
 *
 * NOTE: This route MUST come before /:experimentKey to avoid "assign" being matched as an experiment key
 */
publicRouter.get(
  "/platforms/:platform/environments/:environment/experiments/:experimentKey/assign",
  asyncHandler(experimentController.assignVariationPublic),
);

publicRouter.get(
  "/platforms/:platform/environments/:environment/experiments/:experimentKey",
  asyncHandler(experimentController.getExperiment),
);

// ============================================================================
// STATS EVENT INGESTION (SDK events)
// ============================================================================

/**
 * Batch event ingestion endpoint for SDK stats reporting.
 * Accepts config fetches, flag evaluations, experiment exposures, and conversions.
 */
publicRouter.post(
  "/platforms/:platform/environments/:environment/stats/events",
  asyncHandler(statsController.processBatch),
);

export { publicRouter };
