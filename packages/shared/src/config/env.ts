/**
 * Environment Variable Validation
 *
 * This module validates all environment variables at application startup
 * using Zod schemas. It ensures that:
 * - Required variables are present
 * - Values match expected formats
 * - Type safety is enforced throughout the application
 *
 * Usage:
 * ```typescript
 * import { validateEnv, env } from '@togglebox/shared/config/env';
 *
 * // At application startup (in index.ts or app.ts)
 * validateEnv();
 *
 * // Access validated environment variables
 * const dbType = env.DB_TYPE;
 * const port = env.PORT;
 * ```
 */

import { z } from "zod";

/**
 * Database type options
 */
const DatabaseTypeSchema = z.enum([
  "mysql",
  "postgresql",
  "sqlite",
  "mongodb",
  "dynamodb",
  "d1",
]);

/**
 * Node environment options
 */
const NodeEnvSchema = z.enum(["development", "staging", "production", "test"]);

/**
 * JWT algorithm options (HMAC-based only for secret key auth)
 *
 * @remarks
 * Only HMAC algorithms (HS*) are supported because we use symmetric key authentication.
 * RSA algorithms (RS*) require public/private key pairs, which are not implemented.
 *
 * SECURITY: This allowlist prevents JWT algorithm confusion attacks:
 * - Attacker cannot downgrade to "none" algorithm
 * - Attacker cannot switch between HMAC and RSA
 * - Only safe HMAC variants are allowed (HS256/384/512)
 *
 * See auth middleware for enforcement: packages/shared/src/middleware/auth.ts
 */
const JWTAlgorithmSchema = z.enum([
  "HS256", // SHA-256 HMAC (default, widely supported)
  "HS384", // SHA-384 HMAC (stronger)
  "HS512", // SHA-512 HMAC (strongest)
]);

/**
 * Base environment schema (required for all deployments)
 */
const BaseEnvSchema = z.object({
  // Server configuration
  NODE_ENV: NodeEnvSchema.default("development"),
  PORT: z.string().regex(/^\d+$/).transform(Number).default("3000"),

  // CORS
  CORS_ORIGIN: z.string().default("*"),

  // Database type selection
  DB_TYPE: DatabaseTypeSchema.optional(),

  // Logging
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).optional(),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .optional(),
});

/**
 * Weak/placeholder secret patterns to reject
 */
const WEAK_SECRET_PATTERNS = [
  /^<.*>$/, // <GENERATE_...> placeholders
  /your.?secret/i, // "your-secret", "your_secret"
  /change.?this/i, // "change-this", "change_this"
  /replace.?me/i, // "replace-me", "replace_me"
  /example/i, // "example"
  /test.?secret/i, // "test-secret", "test_secret"
  /default/i, // "default"
  /placeholder/i, // "placeholder"
  /1234567890/, // Repeated digits
  /^a+$/, // Repeated single character
  /^(secret|password|key|token)$/i, // Common weak words
];

/**
 * Validates JWT_SECRET or API_KEY_SECRET is not weak/placeholder
 */
function validateSecret(value: string, fieldName: string): boolean {
  // Check minimum length
  if (value.length < 32) {
    throw new Error(
      `${fieldName} must be at least 32 characters (got ${value.length})`,
    );
  }

  // Check against weak patterns
  for (const pattern of WEAK_SECRET_PATTERNS) {
    if (pattern.test(value)) {
      throw new Error(
        `${fieldName} appears to be a placeholder or weak secret.\n` +
          `Detected pattern: ${pattern}\n` +
          `Generate a strong secret with: openssl rand -base64 32`,
      );
    }
  }

  return true;
}

/**
 * Authentication environment schema
 * All auth variables are optional, but if set, they must meet validation requirements
 */
const AuthEnvSchema = z.object({
  ENABLE_AUTHENTICATION: z
    .string()
    .transform((val) => val === "true")
    .optional(),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .refine((val) => validateSecret(val, "JWT_SECRET"), {
      message: "JWT_SECRET is weak or a placeholder value",
    })
    .optional(),

  JWT_EXPIRES_IN: z.string().default("24h"),

  JWT_ALGORITHM: JWTAlgorithmSchema.default("HS256"),

  JWT_ISSUER: z.string().optional(),

  JWT_AUDIENCE: z.string().optional(),

  API_KEY_SECRET: z
    .string()
    .min(32, "API_KEY_SECRET must be at least 32 characters")
    .refine((val) => validateSecret(val, "API_KEY_SECRET"), {
      message: "API_KEY_SECRET is weak or a placeholder value",
    })
    .optional(),

  API_KEY_EXPIRES_IN: z.string().default("365d"),
});

/**
 * MySQL database environment schema
 */
const MySQLEnvSchema = z.object({
  MYSQL_URL: z
    .string()
    .url()
    .or(z.string().regex(/^mysql:\/\/.+/)),
});

/**
 * PostgreSQL database environment schema
 */
const PostgreSQLEnvSchema = z.object({
  POSTGRES_URL: z
    .string()
    .url()
    .or(z.string().regex(/^postgresql:\/\/.+/)),
});

/**
 * MongoDB database environment schema
 */
const MongoDBEnvSchema = z.object({
  MONGO_URL: z.string().or(z.string().regex(/^mongodb:\/\/.+/)),
  MONGODB_URI: z
    .string()
    .or(z.string().regex(/^mongodb:\/\/.+/))
    .optional(),
});

/**
 * SQLite database environment schema
 */
const SQLiteEnvSchema = z.object({
  SQLITE_FILE: z.string().default("./data/config.db"),
});

/**
 * DynamoDB database environment schema
 *
 * @remarks
 * **Naming Convention:**
 * Uses AWS SDK standard naming (`AWS_REGION`, `DYNAMODB_TABLE`) for consistency.
 * Alternative names (`DYNAMODB_REGION`, `DYNAMODB_TABLE_NAME`) are NOT supported
 * to prevent configuration mismatches between validation and runtime.
 */
const DynamoDBEnvSchema = z.object({
  // AWS region (used by AWS SDK)
  AWS_REGION: z.string().min(1),

  // DynamoDB table name (used by runtime database.ts)
  DYNAMODB_TABLE: z.string().min(1).optional(),

  // Local DynamoDB endpoint (for development)
  DYNAMODB_ENDPOINT: z.string().url().optional(),

  // AWS credentials (optional - use IAM roles in production)
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Table prefix for multi-tenancy
  TABLE_PREFIX: z.string().optional(),
});

/**
 * CloudFront CDN environment schema
 */
const CloudFrontEnvSchema = z.object({
  CLOUDFRONT_DISTRIBUTION_ID: z.string().optional(),
  CACHE_TTL: z.string().regex(/^\d+$/).transform(Number).optional(),
  CACHE_MAX_AGE: z.string().regex(/^\d+$/).transform(Number).optional(),
});

/**
 * Email configuration environment schema
 */
const EmailEnvSchema = z.object({
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  FROM_NAME: z.string().optional(),
  APP_URL: z.string().url().optional(),
});

/**
 * Grafana Cloud logging environment schema
 */
const GrafanaEnvSchema = z.object({
  GRAFANA_CLOUD_API_KEY: z.string().optional(),
  GRAFANA_CLOUD_URL: z.string().url().optional(),
});

/**
 * Validates Stripe price ID format and rejects placeholders
 */
function validateStripePriceId(value: string, fieldName: string): boolean {
  // Check for placeholder patterns
  if (
    /^<.*>$/.test(value) ||
    /placeholder/i.test(value) ||
    /required/i.test(value)
  ) {
    throw new Error(
      `${fieldName} appears to be a placeholder value.\n` +
        `Create a price in Stripe Dashboard and copy the price ID (starts with price_)`,
    );
  }

  // Validate Stripe price ID format
  if (!value.startsWith("price_")) {
    throw new Error(
      `${fieldName} must start with "price_" (got: ${value}).\n` +
        `Get valid price IDs from: https://dashboard.stripe.com/products`,
    );
  }

  return true;
}

/**
 * Stripe billing environment schema (for cloud version)
 */
const StripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z
    .string()
    .refine(
      (val) => val.startsWith("sk_test_") || val.startsWith("sk_live_"),
      "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_",
    ),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .refine(
      (val) => val.startsWith("whsec_"),
      "STRIPE_WEBHOOK_SECRET must start with whsec_",
    ),
  STRIPE_PRICE_PRO_MONTHLY: z
    .string()
    .refine((val) => validateStripePriceId(val, "STRIPE_PRICE_PRO_MONTHLY"), {
      message: "STRIPE_PRICE_PRO_MONTHLY must be a valid Stripe price ID",
    })
    .optional(),
  STRIPE_PRICE_PRO_YEARLY: z
    .string()
    .refine((val) => validateStripePriceId(val, "STRIPE_PRICE_PRO_YEARLY"), {
      message: "STRIPE_PRICE_PRO_YEARLY must be a valid Stripe price ID",
    })
    .optional(),
  STRIPE_PRICE_ENTERPRISE_MONTHLY: z
    .string()
    .refine(
      (val) => validateStripePriceId(val, "STRIPE_PRICE_ENTERPRISE_MONTHLY"),
      {
        message:
          "STRIPE_PRICE_ENTERPRISE_MONTHLY must be a valid Stripe price ID",
      },
    )
    .optional(),
  STRIPE_PRICE_ENTERPRISE_YEARLY: z
    .string()
    .refine(
      (val) => validateStripePriceId(val, "STRIPE_PRICE_ENTERPRISE_YEARLY"),
      {
        message:
          "STRIPE_PRICE_ENTERPRISE_YEARLY must be a valid Stripe price ID",
      },
    )
    .optional(),
  STRIPE_PRICE_API_REQUESTS: z
    .string()
    .refine((val) => validateStripePriceId(val, "STRIPE_PRICE_API_REQUESTS"), {
      message: "STRIPE_PRICE_API_REQUESTS must be a valid Stripe price ID",
    })
    .optional(),
});

/**
 * Resend email service environment schema (for cloud version)
 */
const ResendEnvSchema = z.object({
  RESEND_API_KEY: z
    .string()
    .refine(
      (val) => val.startsWith("re_"),
      "RESEND_API_KEY must start with re_",
    ),
  FROM_EMAIL: z.string().email(),
  FROM_NAME: z.string(),
});

/**
 * Combined environment schema (all possible variables)
 */
const EnvSchema = BaseEnvSchema.merge(AuthEnvSchema)
  .merge(MySQLEnvSchema.partial())
  .merge(PostgreSQLEnvSchema.partial())
  .merge(MongoDBEnvSchema.partial())
  .merge(SQLiteEnvSchema.partial())
  .merge(DynamoDBEnvSchema.partial())
  .merge(CloudFrontEnvSchema.partial())
  .merge(EmailEnvSchema.partial())
  .merge(GrafanaEnvSchema.partial())
  .merge(StripeEnvSchema.partial())
  .merge(ResendEnvSchema.partial());

/**
 * Type of validated environment variables
 */
export type Env = z.infer<typeof EnvSchema>;

/**
 * Validated environment variables (populated after calling validateEnv())
 */
export let env: Env;

/**
 * Validation options
 */
export interface ValidationOptions {
  /**
   * Require authentication environment variables
   */
  requireAuth?: boolean;

  /**
   * Require Stripe billing environment variables (for cloud version)
   */
  requireStripe?: boolean;

  /**
   * Require Resend email environment variables (for cloud version)
   */
  requireResend?: boolean;

  /**
   * Custom validation function for additional checks
   */
  customValidation?: (env: Env) => void;
}

/**
 * Validates environment variables and throws detailed errors if invalid
 *
 * @param options - Validation options
 * @throws {Error} If environment variables are invalid or missing
 *
 * @example
 * ```typescript
 * // Basic validation (open source version)
 * validateEnv();
 *
 * // With authentication required
 * validateEnv({ requireAuth: true });
 *
 * // Cloud version with all features
 * validateEnv({
 *   requireAuth: true,
 *   requireStripe: true,
 *   requireResend: true
 * });
 * ```
 */
export function validateEnv(options: ValidationOptions = {}): void {
  try {
    // Parse environment variables
    const parsed = EnvSchema.safeParse(process.env);

    if (!parsed.success) {
      const errors = parsed.error.errors
        .map((err) => {
          return `  - ${err.path.join(".")}: ${err.message}`;
        })
        .join("\n");

      throw new Error(
        `Environment variable validation failed:\n${errors}\n\n` +
          "Please check your .env file and ensure all required variables are set.\n" +
          "See .env.example for reference.",
      );
    }

    env = parsed.data;

    // Additional validation based on options
    if (options.requireAuth) {
      if (!env.JWT_SECRET || !env.API_KEY_SECRET) {
        throw new Error(
          "Authentication is required but JWT_SECRET or API_KEY_SECRET is missing.\n" +
            "Generate secrets with: openssl rand -base64 32",
        );
      }
    }

    if (options.requireStripe) {
      if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
        throw new Error(
          "Stripe billing is required but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is missing.\n" +
            "Get these from: https://dashboard.stripe.com/apikeys",
        );
      }

      // Validate all required price IDs are set
      const missingPriceIds: string[] = [];
      if (!env.STRIPE_PRICE_PRO_MONTHLY)
        missingPriceIds.push("STRIPE_PRICE_PRO_MONTHLY");
      if (!env.STRIPE_PRICE_PRO_YEARLY)
        missingPriceIds.push("STRIPE_PRICE_PRO_YEARLY");
      if (!env.STRIPE_PRICE_ENTERPRISE_MONTHLY)
        missingPriceIds.push("STRIPE_PRICE_ENTERPRISE_MONTHLY");
      if (!env.STRIPE_PRICE_ENTERPRISE_YEARLY)
        missingPriceIds.push("STRIPE_PRICE_ENTERPRISE_YEARLY");
      if (!env.STRIPE_PRICE_API_REQUESTS)
        missingPriceIds.push("STRIPE_PRICE_API_REQUESTS");

      if (missingPriceIds.length > 0) {
        throw new Error(
          `Stripe billing is required but the following price IDs are missing:\n` +
            `  ${missingPriceIds.join("\n  ")}\n\n` +
            `Create prices in Stripe Dashboard:\n` +
            `  1. Go to https://dashboard.stripe.com/products\n` +
            `  2. Create products for each plan (Pro Monthly, Pro Yearly, etc.)\n` +
            `  3. Copy the price IDs (they start with "price_")\n` +
            `  4. Add them to your .env file`,
        );
      }
    }

    if (options.requireResend) {
      if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
        throw new Error(
          "Resend email service is required but RESEND_API_KEY or FROM_EMAIL is missing.\n" +
            "Get API key from: https://resend.com/api-keys",
        );
      }
    }

    // Database-specific validation
    if (env.DB_TYPE) {
      validateDatabaseConfig(env.DB_TYPE, env);
    }

    // Custom validation
    if (options.customValidation) {
      options.customValidation(env);
    }

    // Log successful validation in development
    if (env.NODE_ENV === "development") {
      const { logger } = require("../logger");
      logger.info("Environment variables validated successfully", {
        nodeEnv: env.NODE_ENV,
        dbType: env.DB_TYPE || "not set",
        authEnabled: env.ENABLE_AUTHENTICATION || false,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      const { logger } = require("../logger");
      logger.error("Environment variable validation error", {
        message: error.message,
      });
    }
    throw error;
  }
}

/**
 * Validates database-specific configuration
 */
function validateDatabaseConfig(dbType: string, env: Env): void {
  switch (dbType) {
    case "mysql":
      if (!env.MYSQL_URL) {
        throw new Error(
          'DB_TYPE is set to "mysql" but MYSQL_URL is missing.\n' +
            "Example: MYSQL_URL=mysql://user:password@localhost:3306/database",
        );
      }
      break;

    case "postgresql":
      if (!env.POSTGRES_URL) {
        throw new Error(
          'DB_TYPE is set to "postgresql" but POSTGRES_URL is missing.\n' +
            "Example: POSTGRES_URL=postgresql://user:password@localhost:5432/database",
        );
      }
      break;

    case "mongodb":
      if (!env.MONGO_URL && !env.MONGODB_URI) {
        throw new Error(
          'DB_TYPE is set to "mongodb" but MONGO_URL is missing.\n' +
            "Example: MONGO_URL=mongodb://localhost:27017/database",
        );
      }
      break;

    case "sqlite":
      // SQLITE_FILE has a default value, so no validation needed
      break;

    case "dynamodb":
      if (!env.AWS_REGION) {
        throw new Error(
          'DB_TYPE is set to "dynamodb" but AWS_REGION is missing.\n' +
            "Example: AWS_REGION=us-east-1\n" +
            "Note: Use AWS_REGION (not DYNAMODB_REGION) for consistency with AWS SDK",
        );
      }
      if (!env.DYNAMODB_TABLE) {
        throw new Error(
          'DB_TYPE is set to "dynamodb" but DYNAMODB_TABLE is missing.\n' +
            "Example: DYNAMODB_TABLE=configurations\n" +
            "Note: Use DYNAMODB_TABLE (not DYNAMODB_TABLE_NAME) for consistency with runtime",
        );
      }
      break;

    case "d1":
      // D1 configuration is handled by Cloudflare Workers runtime
      break;

    default:
      throw new Error(
        `Unknown DB_TYPE: ${dbType}\n` +
          "Valid options: mysql, postgresql, sqlite, mongodb, dynamodb, d1",
      );
  }
}

/**
 * Gets an environment variable with type safety
 *
 * Note: You must call validateEnv() before using this function
 *
 * @param key - Environment variable key
 * @returns The value of the environment variable
 *
 * @example
 * ```typescript
 * const port = getEnv('PORT');
 * const dbType = getEnv('DB_TYPE');
 * ```
 */
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  if (!env) {
    throw new Error(
      "Environment variables not validated. Call validateEnv() first.",
    );
  }
  return env[key];
}

/**
 * Checks if the application is running in production
 */
export function isProduction(): boolean {
  return env?.NODE_ENV === "production";
}

/**
 * Checks if the application is running in development
 */
export function isDevelopment(): boolean {
  return env?.NODE_ENV === "development";
}

/**
 * Checks if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return env?.ENABLE_AUTHENTICATION === true;
}
