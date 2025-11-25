/**
 * Mongoose schemas for authentication entities.
 *
 * @module adapters/mongodb/schemas
 *
 * @remarks
 * **Schema Definitions:**
 * Mongoose schemas define document structure, validation, and indexes.
 * All schemas use TypeScript interfaces for type safety.
 *
 * **Automatic Features:**
 * - ObjectId generation for `_id` field
 * - Timestamps (`createdAt`, `updatedAt`) via `timestamps: true`
 * - Index creation on schema compilation
 * - Type validation before save
 *
 * **Collections:**
 * - `users` - User accounts
 * - `apikeys` - API keys for authentication
 * - `passwordresettokens` - Password reset tokens
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * User document interface extending Mongoose Document.
 *
 * @remarks
 * **Fields:**
 * - `email`: Unique user email (indexed)
 * - `passwordHash`: Bcrypt hashed password
 * - `role`: User role (admin, developer, viewer)
 * - `createdAt`: Auto-generated timestamp
 * - `updatedAt`: Auto-updated timestamp
 */
export interface IUserDocument extends Document {
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for user documents.
 *
 * @remarks
 * **Indexes:**
 * - `email`: Unique index for fast email lookups and preventing duplicates
 *
 * **Validation:**
 * - `email`: Required, unique
 * - `passwordHash`: Required (never store plaintext passwords)
 * - `role`: Required, must be one of ['admin', 'developer', 'viewer']
 *
 * **Timestamps:**
 * - `createdAt`: Set automatically on document creation
 * - `updatedAt`: Updated automatically on every save
 */
const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'developer', 'viewer'] },
  },
  {
    timestamps: true,
  }
);

/**
 * User Mongoose model.
 *
 * @remarks
 * Collection name: `users` (automatically pluralized by Mongoose).
 */
export const UserModel = mongoose.model<IUserDocument>('User', userSchema);

/**
 * API Key document interface extending Mongoose Document.
 *
 * @remarks
 * **Fields:**
 * - `userId`: Owner user ID (indexed for queries)
 * - `name`: Human-readable key name
 * - `keyHash`: Hashed API key (indexed, unique)
 * - `keyPrefix`: First characters for identification
 * - `keyLast4`: Last 4 characters for identification
 * - `permissions`: Array of permission strings
 * - `expiresAt`: Optional expiration date
 * - `lastUsedAt`: Last usage timestamp (updated on each use)
 * - `createdAt`: Auto-generated creation timestamp
 */
export interface IApiKeyDocument extends Document {
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  keyLast4: string;
  permissions: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

/**
 * Mongoose schema for API key documents.
 *
 * @remarks
 * **Indexes:**
 * - `userId`: For querying user's API keys
 * - `keyHash`: Unique index for API key authentication and preventing duplicates
 *
 * **Validation:**
 * - `keyHash`: Required, unique (for authentication)
 * - `permissions`: Required array of permission strings
 * - `expiresAt`: Optional (null = never expires)
 * - `lastUsedAt`: Optional (null = never used)
 *
 * **Timestamps:**
 * - `createdAt`: Set automatically on creation
 * - `updatedAt`: Disabled (not needed for API keys)
 *
 * **Security:**
 * - Never store plaintext API keys
 * - `keyHash` is SHA-256 or bcrypt hash
 * - Full key shown only once at creation
 */
const apiKeySchema = new Schema<IApiKeyDocument>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    keyPrefix: { type: String, required: true },
    keyLast4: { type: String, required: true },
    permissions: { type: [String], required: true },
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

/**
 * API Key Mongoose model.
 *
 * @remarks
 * Collection name: `apikeys` (automatically pluralized by Mongoose).
 */
export const ApiKeyModel = mongoose.model<IApiKeyDocument>('ApiKey', apiKeySchema);

/**
 * Password Reset Token document interface extending Mongoose Document.
 *
 * @remarks
 * **Fields:**
 * - `userId`: User requesting password reset (indexed)
 * - `tokenHash`: Hashed reset token (indexed, unique)
 * - `expiresAt`: Token expiration timestamp (indexed for cleanup)
 * - `createdAt`: Auto-generated creation timestamp
 */
export interface IPasswordResetTokenDocument extends Document {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Mongoose schema for password reset token documents.
 *
 * @remarks
 * **Indexes:**
 * - `userId`: For querying user's reset tokens
 * - `tokenHash`: Unique index for token verification
 * - `expiresAt`: For efficient cleanup of expired tokens
 *
 * **Validation:**
 * - `tokenHash`: Required, unique (for single-use tokens)
 * - `expiresAt`: Required (typically 1 hour from creation)
 *
 * **Timestamps:**
 * - `createdAt`: Set automatically on creation
 * - `updatedAt`: Disabled (tokens are immutable)
 *
 * **Token Lifecycle:**
 * 1. Created with 1-hour expiration
 * 2. Single-use (deleted after password reset)
 * 3. Expired tokens cleaned up via cron job
 *
 * **Security:**
 * - Never store plaintext tokens
 * - `tokenHash` is bcrypt hash
 * - Expiration enforced at application level
 */
const passwordResetTokenSchema = new Schema<IPasswordResetTokenDocument>(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

/**
 * Password Reset Token Mongoose model.
 *
 * @remarks
 * Collection name: `passwordresettokens` (automatically pluralized by Mongoose).
 */
export const PasswordResetTokenModel = mongoose.model<IPasswordResetTokenDocument>(
  'PasswordResetToken',
  passwordResetTokenSchema
);
