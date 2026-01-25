/**
 * Netlify Functions deployment handler.
 *
 * Wraps the Express application for serverless execution in Netlify Functions.
 * Uses serverless-http to convert Netlify event format to Express requests/responses.
 *
 * @remarks
 * **Deployment:**
 * - Deploy using Netlify CLI (`netlify deploy`)
 * - Handler: Netlify Functions format
 * - Configuration in `netlify.toml`
 *
 * **Features:**
 * - Runs on AWS Lambda (Netlify Functions use Lambda under the hood)
 * - Automatic HTTPS and CDN
 * - Edge network distribution
 * - Environment variables via Netlify UI
 *
 * **Differences from AWS Lambda:**
 * - Netlify-specific event format
 * - 10-second timeout on free tier (26 seconds on Pro)
 * - Netlify automatically adds headers and routing
 */

import serverless from 'serverless-http';
import app from './app';
import { logger } from '@togglebox/shared';

/**
 * Serverless-http handler wrapping the Express app for Netlify Functions
 *
 * @remarks
 * Netlify Functions expect a handler that accepts event and context.
 * This is compatible with AWS Lambda format since Netlify uses Lambda underneath.
 */
const serverlessHandler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- serverless-http callback types are not properly typed
  request: (request: any, event: any, context: any) => {
    // Add Netlify context to request for access in controllers/middleware
    request.netlify = {
      event,
      context,
      requestId: context.requestId,
      deployContext: process.env['CONTEXT'], // Netlify deploy context (production, deploy-preview, branch-deploy)
    };

    logger.info('Netlify Function request received', {
      requestId: context.requestId,
      functionName: context.functionName,
      deployContext: process.env['CONTEXT'],
      path: event.path,
      method: event.httpMethod,
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- serverless-http callback types are not properly typed
  response: (response: any, _event: any, context: any) => {
    logger.info('Netlify Function response sent', {
      requestId: context.requestId,
      statusCode: response.statusCode,
    });
  },
});

/**
 * Main Netlify Functions handler
 *
 * @param event - Netlify/Lambda event object
 * @param context - Netlify/Lambda context object
 * @returns Promise resolving to Netlify/Lambda response object
 *
 * @remarks
 * This handler is deployed as a Netlify Function and handles all API requests.
 * Netlify automatically routes requests to this function based on netlify.toml redirects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify Function event/context types vary
export const handler = async (event: any, context: any) => {
  try {
    logger.info('Netlify Function invoked', {
      requestId: context.requestId,
      functionName: context.functionName,
      deployContext: process.env['CONTEXT'],
      remainingTime: context.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() : 'N/A',
    });

    const result = await serverlessHandler(event, context);

    logger.info('Netlify Function completed', {
      requestId: context.requestId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- serverless-http result type varies
      statusCode: (result as any).statusCode || 'unknown',
    });

    return result;
  } catch (error) {
    logger.fatal('Netlify Function failed', error);
    throw error;
  }
};

export default handler;
