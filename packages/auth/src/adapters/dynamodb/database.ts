/**
 * DynamoDB client configuration for authentication data.
 *
 * @module adapters/dynamodb/database
 *
 * @remarks
 * **Separate Tables Design:**
 * Authentication data uses dedicated tables for each entity type:
 * - togglebox-users: User accounts
 * - togglebox-api-keys: API key management
 * - togglebox-password-resets: Password reset tokens
 *
 * **Multi-Tenancy:**
 * Uses table name functions from @togglebox/database that apply tenant-specific
 * table prefixes from AsyncLocalStorage context.
 *
 * **Environment Variables:**
 * - `AWS_REGION` - AWS region (default: "us-east-1")
 * - `DYNAMODB_ENDPOINT` - Custom endpoint for local development
 *
 * **Local Development:**
 * ```bash
 * docker run -p 8000:8000 amazon/dynamodb-local
 * export DYNAMODB_ENDPOINT=http://localhost:8000
 * export AWS_REGION=us-east-1
 * ```
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  getUsersTableName,
  getApiKeysTableName,
  getPasswordResetsTableName,
} from "@togglebox/database";

// Re-export table name functions for auth services
export { getUsersTableName, getApiKeysTableName, getPasswordResetsTableName };

/**
 * DynamoDB Document Client for simplified API.
 *
 * @remarks
 * **Document Client vs Low-Level Client:**
 * - Automatically marshals/unmarshals JavaScript objects to DynamoDB format
 * - Simpler API for common operations (put, get, query, scan)
 * - No need to specify data types (S, N, BOOL, etc.)
 *
 * **Configuration:**
 * - Region: From `AWS_REGION` env var (default: us-east-1)
 * - Endpoint: Optional custom endpoint for local development
 *
 * **Local Development:**
 * Set `DYNAMODB_ENDPOINT=http://localhost:8000` to use DynamoDB Local.
 *
 * **Credentials:**
 * Uses AWS SDK credential chain:
 * 1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
 * 2. AWS credentials file (`~/.aws/credentials`)
 * 3. IAM role (when running in AWS Lambda/EC2)
 */
const client = new DynamoDBClient({
  region: process.env["AWS_REGION"] || "us-east-1",
  ...(process.env["DYNAMODB_ENDPOINT"] && {
    endpoint: process.env["DYNAMODB_ENDPOINT"],
  }),
});

export const dynamoDBClient = DynamoDBDocumentClient.from(client);
