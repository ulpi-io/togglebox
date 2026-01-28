/**
 * Database configuration system with multi-provider support.
 *
 * @remarks
 * Supports runtime database selection via DB_TYPE environment variable:
 * - mysql (uses Prisma)
 * - postgresql (uses Prisma) - includes Supabase support
 * - mongodb (uses Mongoose)
 * - sqlite (uses Prisma)
 * - dynamodb (uses AWS SDK)
 * - d1 (uses Cloudflare D1 - requires database binding)
 */

export type DatabaseType =
  | "mysql"
  | "postgresql"
  | "mongodb"
  | "sqlite"
  | "dynamodb"
  | "d1";

export interface DynamoDBConfig {
  tableName: string;
  region: string;
  endpoint?: string;
}

export interface DatabaseConfig {
  type: DatabaseType;
  mysqlUrl?: string;
  postgresUrl?: string;
  mongoUrl?: string;
  sqliteFile?: string;
  dynamodb?: DynamoDBConfig;
  d1Database?: any; // D1Database type - passed from Cloudflare Workers environment binding
}

/**
 * Loads database configuration from environment variables.
 *
 * @returns Database configuration object
 *
 * @throws {Error} If DB_TYPE is not specified or invalid
 * @throws {Error} If required configuration for selected database type is missing
 *
 * @remarks
 * **Environment Variables:**
 *
 * **Required:**
 * - DB_TYPE: Database type (mysql | postgresql | mongodb | sqlite | dynamodb | d1)
 *
 * **MySQL:**
 * - MYSQL_URL: Connection URL (e.g., mysql://user:pass@host:3306/db)
 *
 * **PostgreSQL / Supabase:**
 * - POSTGRES_URL: Connection URL (e.g., postgresql://user:pass@host:5432/db)
 * - For Supabase: Get from Supabase Dashboard > Project Settings > Database > Connection String
 *
 * **MongoDB:**
 * - MONGO_URL: Connection URL (e.g., mongodb://user:pass@host:27017/db)
 *
 * **SQLite:**
 * - SQLITE_FILE: Database file path (e.g., ./data/config.db)
 *
 * **DynamoDB:**
 * - DYNAMODB_TABLE: Table name (e.g., configurations)
 * - AWS_REGION: AWS region (e.g., us-east-1)
 * - DYNAMODB_ENDPOINT: (Optional) Local endpoint (e.g., http://localhost:8000)
 *
 * **Cloudflare D1:**
 * - Note: D1 database binding is provided via Cloudflare Workers environment,
 *   not through environment variables. Use createDatabaseRepositories() directly
 *   with the D1 binding from your Worker's env.
 */
export function loadDatabaseConfig(): DatabaseConfig {
  const dbType = process.env["DB_TYPE"] as DatabaseType;

  if (!dbType) {
    throw new Error(
      "DB_TYPE environment variable is required. Valid values: mysql, postgresql, mongodb, sqlite, dynamodb, d1",
    );
  }

  const validTypes: DatabaseType[] = [
    "mysql",
    "postgresql",
    "mongodb",
    "sqlite",
    "dynamodb",
    "d1",
  ];
  if (!validTypes.includes(dbType)) {
    throw new Error(
      `Invalid DB_TYPE: ${dbType}. Valid values: ${validTypes.join(", ")}`,
    );
  }

  const config: DatabaseConfig = { type: dbType };

  switch (dbType) {
    case "mysql":
      config.mysqlUrl = process.env["MYSQL_URL"];
      if (!config.mysqlUrl) {
        throw new Error(
          "MYSQL_URL environment variable is required when DB_TYPE=mysql",
        );
      }
      break;

    case "postgresql":
      config.postgresUrl = process.env["POSTGRES_URL"];
      if (!config.postgresUrl) {
        throw new Error(
          "POSTGRES_URL environment variable is required when DB_TYPE=postgresql",
        );
      }
      break;

    case "mongodb":
      config.mongoUrl = process.env["MONGO_URL"];
      if (!config.mongoUrl) {
        throw new Error(
          "MONGO_URL environment variable is required when DB_TYPE=mongodb",
        );
      }
      break;

    case "sqlite":
      config.sqliteFile = process.env["SQLITE_FILE"] || "./data/config.db";
      break;

    case "dynamodb":
      const tableName = process.env["DYNAMODB_TABLE"];
      const region = process.env["AWS_REGION"];

      if (!tableName) {
        throw new Error(
          "DYNAMODB_TABLE environment variable is required when DB_TYPE=dynamodb.\n" +
            "Note: Use DYNAMODB_TABLE (not DYNAMODB_TABLE_NAME) for consistency with AWS SDK.",
        );
      }
      if (!region) {
        throw new Error(
          "AWS_REGION environment variable is required when DB_TYPE=dynamodb.\n" +
            "Note: Use AWS_REGION (not DYNAMODB_REGION) for consistency with AWS SDK.",
        );
      }

      config.dynamodb = {
        tableName,
        region,
        endpoint: process.env["DYNAMODB_ENDPOINT"],
      };
      break;

    case "d1":
      // D1 database binding comes from Cloudflare Workers environment
      // It cannot be loaded from environment variables
      // Use createDatabaseRepositories() directly with the binding
      break;
  }

  return config;
}

/**
 * Gets the current database type from environment variables.
 *
 * @returns Database type, or null if not configured
 *
 * @example
 * ```ts
 * const dbType = getDatabaseType();
 * if (dbType === 'dynamodb') {
 *   console.log('Using DynamoDB');
 * } else if (dbType === 'mysql') {
 *   console.log('Using MySQL via Prisma');
 * }
 * ```
 */
export function getDatabaseType(): DatabaseType | null {
  return (process.env["DB_TYPE"] as DatabaseType) || null;
}
