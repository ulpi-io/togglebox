/**
 * Main entry point for standalone Node.js server deployment.
 *
 * @remarks
 * Starts the HTTP server on the configured PORT.
 *
 * Used for:
 * - Local development (`npm run dev`)
 * - Docker deployments
 * - AWS ECS/Fargate deployments
 */

import app from './app';
import { logger, config } from '@togglebox/shared';

const PORT = config.env.PORT;

app.listen(PORT, () => {
  logger.info(`Config Service started on port ${PORT}`);
  logger.info(`Environment: ${config.env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

export default app;