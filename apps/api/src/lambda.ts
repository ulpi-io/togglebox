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

import serverless from "serverless-http";
import app from "./app";
import { logger } from "@togglebox/shared";

/**
 * Serverless-http handler wrapping the Express app.
 *
 * @remarks
 * Configures binary response support and manually parses request body from Lambda event.
 * serverless-http v2 doesn't automatically parse the body from API Gateway events.
 */
const handler = serverless(app, {
  binary: ["image/*", "application/pdf"],
  request(request: any, event: any) {
    // Manually parse body from Lambda event
    if (event.body) {
      try {
        // API Gateway sends body as string (or base64 if binary)
        const bodyString = event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString("utf8")
          : event.body;
        
        // Parse JSON if content-type is application/json
        const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
        if (contentType.includes("application/json")) {
          request.body = JSON.parse(bodyString);
        } else {
          request.body = bodyString;
        }
      } catch (error) {
        logger.error("Failed to parse request body", error);
      }
    }
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- AWS Lambda event/context types vary by trigger
export const lambdaHandler = async (event: any, context: any) => {
  try {
    // Debug: Log headers to see what's being received
    logger.info("Lambda invoked", {
      path: event.path,
      method: event.httpMethod,
      hasAuthHeader: !!event.headers?.Authorization || !!event.headers?.authorization,
      hasApiKeyHeader: !!event.headers?.["X-API-Key"] || !!event.headers?.["x-api-key"],
    });
    
    const result = await handler(event, context);
    return result;
  } catch (error) {
    logger.fatal("Lambda function failed", error);
    throw error;
  }
};

export default lambdaHandler;
