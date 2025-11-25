/**
 * Mongoose schemas and models for MongoDB adapter.
 *
 * @module schemas
 *
 * @remarks
 * Defines Mongoose schemas for all entities with indexes and constraints.
 *
 * **Index Strategy:**
 * - Unique indexes for business keys (name, composite keys)
 * - Foreign key indexes for joins (platformId references)
 * - Compound indexes for common query patterns
 *
 * **Timestamps:**
 * - Stored as ISO-8601 strings (not MongoDB Date objects)
 * - Allows consistent timestamp format across all adapters
 *
 * **JSON Storage:**
 * - Complex fields (config, targeting arrays) stored as JSON strings
 * - Parsed/stringified in repository layer
 */

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Platform document interface for Mongoose.
 */
export interface IPlatformDocument extends Document {
  name: string;
  description?: string;
  createdAt: string;
}

/**
 * Platform schema with unique name index.
 *
 * @remarks
 * **Indexes:**
 * - name: unique, indexed for fast lookups
 */
const PlatformSchema = new Schema<IPlatformDocument>({
  name: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: false },
  createdAt: { type: String, required: true },
});

/**
 * Platform Mongoose model.
 */
export const PlatformModel = mongoose.model<IPlatformDocument>('Platform', PlatformSchema);

/**
 * Environment document interface for Mongoose.
 */
export interface IEnvironmentDocument extends Document {
  platform: string;
  environment: string;
  platformId: mongoose.Types.ObjectId;
  description?: string;
  createdAt: string;
}

/**
 * Environment schema with foreign key and composite unique index.
 *
 * @remarks
 * **Indexes:**
 * - (platform + environment): compound unique index
 * - platformId: indexed for foreign key lookups
 */
const EnvironmentSchema = new Schema<IEnvironmentDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  platformId: { type: Schema.Types.ObjectId, ref: 'Platform', required: true, index: true },
  description: { type: String, required: false },
  createdAt: { type: String, required: true },
});

// Compound unique index for platform + environment
EnvironmentSchema.index({ platform: 1, environment: 1 }, { unique: true });

/**
 * Environment Mongoose model.
 */
export const EnvironmentModel = mongoose.model<IEnvironmentDocument>('Environment', EnvironmentSchema);

/**
 * Config version document interface for Mongoose.
 */
export interface IConfigVersionDocument extends Document {
  platform: string;
  environment: string;
  versionTimestamp: string;
  platformId: mongoose.Types.ObjectId;
  versionLabel?: string;
  isStable: boolean;
  config: string; // JSON stored as string
  createdBy: string;
  createdAt: string;
}

/**
 * Config version schema with multiple indexes for query optimization.
 *
 * @remarks
 * **Indexes:**
 * - (platform + environment + versionTimestamp): compound unique index
 * - (platform + environment + isStable): for finding stable versions
 * - platformId: indexed for foreign key lookups
 */
const ConfigVersionSchema = new Schema<IConfigVersionDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  versionTimestamp: { type: String, required: true },
  platformId: { type: Schema.Types.ObjectId, ref: 'Platform', required: true, index: true },
  versionLabel: { type: String, required: false },
  isStable: { type: Boolean, required: true, default: false },
  config: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: String, required: true },
});

// Compound unique index for platform + environment + versionTimestamp
ConfigVersionSchema.index({ platform: 1, environment: 1, versionTimestamp: 1 }, { unique: true });
// Index for finding stable versions
ConfigVersionSchema.index({ platform: 1, environment: 1, isStable: 1 });

/**
 * Config version Mongoose model.
 */
export const ConfigVersionModel = mongoose.model<IConfigVersionDocument>('ConfigVersion', ConfigVersionSchema);

/**
 * Feature flag document interface for Mongoose.
 */
export interface IFeatureFlagDocument extends Document {
  platform: string;
  environment: string;
  flagName: string;
  platformId: mongoose.Types.ObjectId;
  enabled: boolean;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  rolloutType: string;
  rolloutPercentage?: number;
  targetUserIds: string; // JSON array as string
  excludeUserIds: string; // JSON array as string
  targetCountries: string; // JSON array as string
  targetLanguages: string; // JSON array as string
}

/**
 * Feature flag schema with indexes for flags queries.
 *
 * @remarks
 * **Indexes:**
 * - (platform + environment + flagName): compound unique index
 * - (platform + environment): for listing all flags
 * - platformId: indexed for foreign key lookups
 *
 * **JSON Arrays:**
 * Targeting arrays stored as JSON strings with default '[]'.
 */
const FeatureFlagSchema = new Schema<IFeatureFlagDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  flagName: { type: String, required: true },
  platformId: { type: Schema.Types.ObjectId, ref: 'Platform', required: true, index: true },
  enabled: { type: Boolean, required: true, default: false },
  description: { type: String, required: false },
  createdBy: { type: String, required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: false },
  rolloutType: { type: String, required: true, default: 'simple' },
  rolloutPercentage: { type: Number, required: false },
  targetUserIds: { type: String, required: true, default: '[]' },
  excludeUserIds: { type: String, required: true, default: '[]' },
  targetCountries: { type: String, required: true, default: '[]' },
  targetLanguages: { type: String, required: true, default: '[]' },
});

// Compound unique index for platform + environment + flagName
FeatureFlagSchema.index({ platform: 1, environment: 1, flagName: 1 }, { unique: true });
// Index for listing flags
FeatureFlagSchema.index({ platform: 1, environment: 1 });

/**
 * Feature flag Mongoose model.
 */
export const FeatureFlagModel = mongoose.model<IFeatureFlagDocument>('FeatureFlag', FeatureFlagSchema);
