import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { publicRouter, internalRouter, authRouter } from './routes';
import { logger, errorHandler, notFoundHandler, corsHeaders, securityHeaders, requestId, sanitizeInput, rateLimitByIP, defaultDatabaseContext } from '@togglebox/shared';
import { validateEnv, env, appConfig } from '@togglebox/shared/config';
import { cacheHeaders, noCacheHeaders } from '@togglebox/cache';

// Load environment variables from .env file
dotenv.config();

// Validate environment variables at startup
// This will throw an error and prevent startup if required variables are missing or invalid
validateEnv();

const app = express();
const PORT = env.PORT;

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
  process.env['AWS_LAMBDA_FUNCTION_NAME'] ||      // AWS Lambda
  process.env['NETLIFY'] ||                        // Netlify Functions
  process.env['CF_PAGES'] ||                       // Cloudflare Pages/Workers
  process.env['VERCEL']                            // Vercel Functions
);

// Security middleware (skip on serverless - handled by edge/gateway)
if (!isServerless) {
  app.use(helmet({
    contentSecurityPolicy: appConfig.SECURITY.csp,
    hsts: appConfig.SECURITY.hsts,
  }));
}

app.use(securityHeaders);
app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: appConfig.SECURITY.cors.methods,
  allowedHeaders: appConfig.SECURITY.cors.allowedHeaders,
  maxAge: appConfig.SECURITY.cors.maxAge,
}));
app.use(corsHeaders);

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
app.use(express.json({ limit: appConfig.REQUEST.jsonLimit }));
app.use(express.urlencoded({
  extended: appConfig.REQUEST.urlencodedExtended,
  limit: appConfig.REQUEST.urlencodedLimit
}));

// Logging middleware
app.use(logger.getHttpLogger());

// Database context middleware (sets req.dbConfig for multitenancy support)
app.use(defaultDatabaseContext());

// Health check endpoint (before routes)
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: `${appConfig.APP_NAME} is running`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: appConfig.APP_VERSION,
  });
});

// Cache headers middleware
// Apply cache headers to public GET endpoints
app.use('/api/v1/platforms', cacheHeaders({
  ttl: appConfig.CACHE.ttl,
  maxAge: appConfig.CACHE.maxAge,
}));

// Disable caching on internal endpoints (write operations)
app.use('/api/v1/internal', noCacheHeaders());

// API routes
app.use('/api/v1', publicRouter);           // Public read-only endpoints
app.use('/api/v1/internal', internalRouter); // Internal write endpoints
app.use('/api/v1', authRouter);             // Auth endpoints (conditionally loaded)

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: appConfig.APP_NAME,
    description: appConfig.APP_DESCRIPTION,
    version: appConfig.APP_VERSION,
    timestamp: new Date().toISOString(),
    endpoints: {
      public: {
        health: '/health',
        platforms: `${appConfig.API.basePath}/platforms`,
        environments: `${appConfig.API.basePath}/platforms/:platform/environments`,
        versions: `${appConfig.API.basePath}/platforms/:platform/environments/:environment/versions`,
        latestStable: `${appConfig.API.basePath}/platforms/:platform/environments/:environment/versions/latest/stable`,
        webhookStatus: `${appConfig.API.basePath}/webhook/cache/invalidations`,
      },
      internal: {
        createPlatform: `POST ${appConfig.API.internalBasePath}/platforms`,
        createEnvironment: `POST ${appConfig.API.internalBasePath}/platforms/:platform/environments`,
        createVersion: `POST ${appConfig.API.internalBasePath}/platforms/:platform/environments/:environment/versions`,
        updateVersion: `PUT ${appConfig.API.internalBasePath}/platforms/:platform/environments/:environment/versions/:version`,
        deleteVersion: `DELETE ${appConfig.API.internalBasePath}/platforms/:platform/environments/:environment/versions/:version`,
        cacheInvalidate: `POST ${appConfig.API.internalBasePath}/cache/invalidate`,
        webhookInvalidate: `GET ${appConfig.API.internalBasePath}/webhook/cache/invalidate`,
      },
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception', error);
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

export default app;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Config Service started on port ${PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
  });
}