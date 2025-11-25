import { createAuthRouter } from '@togglebox/auth';
import { logger } from '@togglebox/shared';
import { env } from '@togglebox/shared/config/env';

/**
 * Auth router - ALWAYS loaded
 * Provides user registration, login, and API key management
 *
 * Endpoints:
 *   - /api/v1/auth/* - Authentication (register, login, password reset)
 *   - /api/v1/users/* - User profile management
 *   - /api/v1/api-keys/* - API key management
 */

const authRouter = createAuthRouter({
  dbType: (env.DB_TYPE || 'dynamodb') as 'mysql' | 'postgresql' | 'sqlite' | 'mongodb' | 'dynamodb' | 'd1',
  authEnabled: true,
});

logger.info('Auth module loaded');
logger.info('Auth endpoints: /api/v1/auth/*, /api/v1/users/*, /api/v1/api-keys/*');

export { authRouter };
