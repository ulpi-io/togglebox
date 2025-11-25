/**
 * AWS Lambda deployment handler.
 *
 * Wraps the Express application for serverless execution in AWS Lambda.
 * Uses serverless-http to convert Lambda events to Express requests/responses.
 *
 * @remarks
 * **Deployment:**
 * - Deploy using Serverless Framework (`serverless deploy`)
 * - Handler: `dist/lambda.lambdaHandler`
 * - Configuration in `serverless.yml`
 *
 * **Features:**
 * - Binary response support for images and PDFs
 * - Detailed Lambda context logging
 * - Request/response tracking with AWS request IDs
 */

import serverless from 'serverless-http';
import app from './app';
import { logger } from '@togglebox/shared';

/**
 * Serverless-http handler wrapping the Express app.
 *
 * @remarks
 * Configures binary response support and adds Lambda context to requests.
 */
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
  request: (request: any, event: any, context: any) => {
    // Add Lambda context to request for access in controllers/middleware
    request.lambda = {
      event,
      context,
      requestId: context.awsRequestId,
    };

    logger.info('Lambda request received', {
      requestId: context.awsRequestId,
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      memoryLimitInMB: context.memoryLimitInMB,
    });
  },
  response: (response: any, _event: any, context: any) => {
    logger.info('Lambda response sent', {
      requestId: context.awsRequestId,
      statusCode: response.statusCode,
    });
  },
});

/**
 * Main AWS Lambda handler function.
 *
 * @param event - AWS Lambda event object (API Gateway, ALB, etc.)
 * @param context - AWS Lambda context object with execution metadata
 * @returns Promise resolving to Lambda response object
 *
 * @remarks
 * Logs function invocation details, execution time, and completion status.
 * Fatal errors are logged before re-throwing to Lambda runtime.
 */
export const lambdaHandler = async (event: any, context: any) => {
  try {
    logger.info('Lambda function invoked', {
      requestId: context.awsRequestId,
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      memoryLimitInMB: context.memoryLimitInMB,
      remainingTimeInMillis: context.getRemainingTimeInMillis(),
    });

    const result = await handler(event, context);

    logger.info('Lambda function completed', {
      requestId: context.awsRequestId,
      statusCode: (result as any).statusCode || 'unknown',
    });

    return result;
  } catch (error) {
    logger.fatal('Lambda function failed', error);
    throw error;
  }
};

export default lambdaHandler;