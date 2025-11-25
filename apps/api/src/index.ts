/**
 * Main entry point for standalone Node.js server deployment.
 *
 * @remarks
 * Re-exports the Express application instance. When run directly (not imported),
 * the app.ts file starts the HTTP server on the configured PORT.
 *
 * Used for:
 * - Local development (`npm run dev`)
 * - Docker deployments
 * - AWS ECS/Fargate deployments
 */

import app from './app';

export default app;