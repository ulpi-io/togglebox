/**
 * MongoDB connection management for authentication data.
 *
 * @module adapters/mongodb/database
 *
 * @remarks
 * **Mongoose Connection Singleton:**
 * Mongoose maintains a global connection state.
 * Multiple calls to `connectMongoDB()` reuse the same connection.
 *
 * **Connection States:**
 * - 0: Disconnected
 * - 1: Connected
 * - 2: Connecting
 * - 3: Disconnecting
 *
 * **Environment Variables:**
 * - `MONGODB_URI` - Connection string (default: mongodb://localhost:27017/togglebox-auth)
 *
 * **Connection String Formats:**
 * ```
 * # Local MongoDB
 * mongodb://localhost:27017/togglebox-auth
 *
 * # MongoDB Atlas
 * mongodb+srv://user:pass@cluster.mongodb.net/togglebox-auth?retryWrites=true&w=majority
 *
 * # Replica Set
 * mongodb://host1:27017,host2:27017/togglebox-auth?replicaSet=myReplicaSet
 * ```
 *
 * **Connection Pooling:**
 * Mongoose automatically manages connection pooling.
 * Default pool size: 5 connections (configurable via connection options).
 *
 * **Graceful Shutdown:**
 * Call `disconnectMongoDB()` in shutdown handlers to close connections cleanly.
 */

import mongoose from "mongoose";
import { logger } from "@togglebox/shared";

/**
 * MongoDB connection URI from environment or default.
 *
 * @remarks
 * **Security:**
 * Connection string may contain credentials - never log the raw URI.
 * Use sanitized version (credentials masked) for logging.
 */
const MONGODB_URI =
  process.env["MONGODB_URI"] || "mongodb://localhost:27017/togglebox-auth";

/**
 * Connect to MongoDB using Mongoose.
 *
 * @returns Promise that resolves when connected
 *
 * @remarks
 * **Idempotent:**
 * Safe to call multiple times - reuses existing connection if already connected.
 *
 * **Connection Lifecycle:**
 * 1. Checks readyState (0 = disconnected)
 * 2. Connects to MongoDB via Mongoose
 * 3. Logs connection success with sanitized URI
 *
 * **Error Handling:**
 * Throws error if connection fails. Caller should handle and retry if needed.
 *
 * **Application Startup:**
 * Call this once during application initialization:
 * ```typescript
 * await connectMongoDB();
 * ```
 */
export async function connectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    logger.info("Connected to MongoDB", {
      database: "auth",
      uri: MONGODB_URI.replace(/\/\/.*@/, "//<credentials>@"),
    });
  }
}

/**
 * Disconnect from MongoDB.
 *
 * @returns Promise that resolves when disconnected
 *
 * @remarks
 * **Graceful Shutdown:**
 * Call during application shutdown to cleanly close all connections.
 *
 * **Idempotent:**
 * Safe to call when already disconnected (no-op).
 *
 * **Shutdown Handler Example:**
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   await disconnectMongoDB();
 *   process.exit(0);
 * });
 * ```
 */
export async function disconnectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB", { database: "auth" });
  }
}

/**
 * Check if MongoDB is connected.
 *
 * @returns true if connected (readyState === 1), false otherwise
 *
 * @remarks
 * **Use Cases:**
 * - Health check endpoints
 * - Readiness probes for Kubernetes
 * - Connection status monitoring
 *
 * **Connection States:**
 * - 0: Disconnected
 * - 1: Connected (this function returns true)
 * - 2: Connecting
 * - 3: Disconnecting
 */
export function isMongoDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
