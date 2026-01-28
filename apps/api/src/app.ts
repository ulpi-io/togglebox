import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import { publicRouter, internalRouter, authRouter } from "./routes";
import {
  logger,
  errorHandler,
  notFoundHandler,
  securityHeaders,
  requestId,
  sanitizeInput,
  defaultDatabaseContext,
  config,
} from "@togglebox/shared";
import { cacheHeaders, noCacheHeaders } from "@togglebox/cache";

// Load environment variables from .env file
dotenv.config();

// Validate environment variables at startup
// This will throw an error and prevent startup if required variables are missing or invalid
config.validateEnv();

const app: express.Application = express();

/**
 * Detect serverless environment (Lambda, Cloudflare Workers, Netlify Functions)
 *
 * @remarks
 * On serverless platforms:
 * - API Gateway/CloudFront handles compression (no need for compression middleware)
 * - HTTPS/HSTS/CSP headers set at edge (no need for helmet middleware)
 * - Applying these adds unnecessary CPU overhead and cold start latency
 *
 * On traditional servers (Docker, self-hosted):
 * - Application must handle compression and security headers
 */
const isServerless = Boolean(
  process.env["AWS_LAMBDA_FUNCTION_NAME"] || // AWS Lambda
    process.env["NETLIFY"] || // Netlify Functions
    process.env["CF_PAGES"] || // Cloudflare Pages/Workers
    process.env["VERCEL"], // Vercel Functions
);

// Security middleware (skip on serverless - handled by edge/gateway)
if (!isServerless) {
  app.use(
    helmet({
      contentSecurityPolicy: config.appConfig.SECURITY.csp,
      hsts: config.appConfig.SECURITY.hsts,
    }),
  );
}

app.use(securityHeaders);
app.use(
  cors({
    origin: config.env.CORS_ORIGIN,
    methods: [...config.appConfig.SECURITY.cors.methods],
    allowedHeaders: [...config.appConfig.SECURITY.cors.allowedHeaders],
    maxAge: config.appConfig.SECURITY.cors.maxAge,
    credentials: true,
  }),
);

// Request middleware
app.use(requestId);
app.use(sanitizeInput);

/**
 * Rate Limiting: Handled at infrastructure level
 *
 * @remarks
 * In-memory rate limiting does not work for multi-node deployments.
 * Implement rate limiting using one of these approaches:
 *
 * **Serverless deployments:**
 * - AWS Lambda: API Gateway throttling (see serverless.yml)
 * - Cloudflare Workers: Durable Objects or KV-based rate limiting
 * - Netlify: Edge Functions rate limiting
 *
 * **Multi-node deployments:**
 * - Redis-based rate limiting (ioredis + express-rate-limit)
 * - DynamoDB-based rate limiting with conditional updates
 * - API Gateway / Load Balancer throttling
 *
 * **Single-node deployments only:**
 * - Can use in-memory rate limiting (express-rate-limit)
 * - Not recommended for production (single point of failure)
 */

// Body parsing middleware
// Compression: Skip on serverless (CloudFront/edge handles it more efficiently)
if (!isServerless) {
  app.use(compression());
}
app.use(express.json({ limit: config.appConfig.REQUEST.jsonLimit }));
app.use(
  express.urlencoded({
    extended: config.appConfig.REQUEST.urlencodedExtended,
    limit: config.appConfig.REQUEST.urlencodedLimit,
  }),
);

// Logging middleware
app.use(logger.getHttpLogger() as express.RequestHandler);

// Database context middleware (sets req.dbConfig for multitenancy support)
app.use(defaultDatabaseContext());

// Health check endpoint (before routes)
// Simple liveness check - doesn't verify dependencies
// Note: environment and version removed to prevent information disclosure
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: `${config.appConfig.APP_NAME} is running`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness check endpoint - verifies database connectivity
app.get("/ready", async (_req, res) => {
  try {
    // Import Container to access database
    const { Container } = await import("./container");
    const db = Container.getDatabase();

    // Perform simple database query to verify connectivity
    // Using listPlatforms with limit to minimize database load
    await db.platform.listPlatforms({ limit: 1 });

    res.json({
      success: true,
      message: "Service is ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "connected",
      },
    });
  } catch (error) {
    logger.error("Readiness check failed", error);
    res.status(503).json({
      success: false,
      message: "Service not ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "disconnected",
      },
      error:
        error instanceof Error ? error.message : "Database connection failed",
    });
  }
});

// Cache headers middleware
// Disable caching on user-specific endpoints (evaluate, assign) BEFORE general cache headers
// These endpoints return personalized responses based on userId/context
app.use("/api/v1/platforms", (req, res, next) => {
  // User-specific endpoints should not be cached
  if (req.path.includes("/evaluate") || req.path.includes("/assign")) {
    return noCacheHeaders()(req, res, next);
  }
  // Apply cache headers to public read-only endpoints
  return cacheHeaders({
    ttl: config.appConfig.CACHE.ttl,
    maxAge: config.appConfig.CACHE.maxAge,
  })(req, res, next);
});

// Disable caching on internal endpoints (write operations)
app.use("/api/v1/internal", noCacheHeaders());

// API routes
// NOTE: authRouter must come FIRST because publicRouter applies conditionalAuth()
// middleware which would block unauthenticated requests to /auth/login, /auth/register
app.use("/api/v1", authRouter); // Auth endpoints (login, register - no auth required)
app.use("/api/v1", publicRouter); // Public read-only endpoints (conditionalAuth)
app.use("/api/v1/internal", internalRouter); // Internal write endpoints (requireAuth)

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: config.appConfig.APP_NAME,
    description: config.appConfig.APP_DESCRIPTION,
    version: config.appConfig.APP_VERSION,
    timestamp: new Date().toISOString(),
    endpoints: {
      public: {
        health: "/health",
        ready: "/ready",
        platforms: `${config.appConfig.API.basePath}/platforms`,
        environments: `${config.appConfig.API.basePath}/platforms/:platform/environments`,
        configs: `${config.appConfig.API.basePath}/platforms/:platform/environments/:environment/configs`,
        flags: `${config.appConfig.API.basePath}/platforms/:platform/environments/:environment/flags`,
        experiments: `${config.appConfig.API.basePath}/platforms/:platform/environments/:environment/experiments`,
        webhookStatus: `${config.appConfig.API.basePath}/webhook/cache/invalidations`,
      },
      internal: {
        createPlatform: `POST ${config.appConfig.API.internalBasePath}/platforms`,
        createEnvironment: `POST ${config.appConfig.API.internalBasePath}/platforms/:platform/environments`,
        createConfigParameter: `POST ${config.appConfig.API.internalBasePath}/platforms/:platform/environments/:environment/configs`,
        updateConfigParameter: `PATCH ${config.appConfig.API.internalBasePath}/platforms/:platform/environments/:environment/configs/:parameterKey`,
        deleteConfigParameter: `DELETE ${config.appConfig.API.internalBasePath}/platforms/:platform/environments/:environment/configs/:parameterKey`,
        cacheInvalidate: `POST ${config.appConfig.API.internalBasePath}/cache/invalidate`,
        webhookInvalidate: `GET ${config.appConfig.API.internalBasePath}/webhook/cache/invalidate`,
      },
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Uncaught exception handler
process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught Exception", error);
  process.exit(1);
});

// Unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
  logger.fatal("Unhandled Rejection", { reason, promise });
  process.exit(1);
});

export default app;
