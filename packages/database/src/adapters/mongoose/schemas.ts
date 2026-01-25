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
  versionLabel: string;  // Primary identifier for get/delete operations
  versionTimestamp: string;
  platformId: mongoose.Types.ObjectId;
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
 * - (platform + environment + versionLabel): compound unique index - PRIMARY KEY
 * - (platform + environment + versionTimestamp): compound unique index - for ordering
 * - (platform + environment + isStable): for finding stable versions
 * - platformId: indexed for foreign key lookups
 *
 * **Version Identification:**
 * versionLabel is the primary identifier for get/delete/update operations,
 * ensuring consistency across all database adapters (DynamoDB, Prisma, D1, Mongoose).
 */
const ConfigVersionSchema = new Schema<IConfigVersionDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  versionLabel: { type: String, required: true },  // Primary identifier
  versionTimestamp: { type: String, required: true },
  platformId: { type: Schema.Types.ObjectId, ref: 'Platform', required: true, index: true },
  isStable: { type: Boolean, required: true, default: false },
  config: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: String, required: true },
});

// Compound unique index for platform + environment + versionLabel (PRIMARY KEY)
ConfigVersionSchema.index({ platform: 1, environment: 1, versionLabel: 1 }, { unique: true });
// Compound unique index for platform + environment + versionTimestamp (for ordering)
ConfigVersionSchema.index({ platform: 1, environment: 1, versionTimestamp: 1 }, { unique: true });
// Index for finding stable versions
ConfigVersionSchema.index({ platform: 1, environment: 1, isStable: 1 });

/**
 * Config version Mongoose model.
 */
export const ConfigVersionModel = mongoose.model<IConfigVersionDocument>('ConfigVersion', ConfigVersionSchema);

/**
 * Flag document interface for Mongoose.
 */
export interface IFlagDocument extends Document {
  platform: string;
  environment: string;
  flagKey: string;
  name: string;
  description?: string;
  enabled: boolean;
  flagType: 'boolean' | 'string' | 'number';
  valueA: boolean | string | number;
  valueB: boolean | string | number;
  targeting: string; // JSON stored as string
  defaultValue: 'A' | 'B';
  // Percentage rollout
  rolloutEnabled: boolean;
  rolloutPercentageA: number;
  rolloutPercentageB: number;
  version: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Flag schema with versioning and indexes.
 *
 * @remarks
 * **Indexes:**
 * - (platform + environment + flagKey + version): compound unique index
 * - (platform + environment + flagKey + isActive): for finding active version
 */
const FlagSchema = new Schema<IFlagDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  flagKey: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: false },
  enabled: { type: Boolean, required: true },
  flagType: { type: String, required: true, enum: ['boolean', 'string', 'number'] },
  valueA: { type: Schema.Types.Mixed, required: true },
  valueB: { type: Schema.Types.Mixed, required: true },
  targeting: { type: String, required: true }, // JSON as string
  defaultValue: { type: String, required: true, enum: ['A', 'B'] },
  // Percentage rollout
  rolloutEnabled: { type: Boolean, required: false, default: false },
  rolloutPercentageA: { type: Number, required: false, default: 100, min: 0, max: 100 },
  rolloutPercentageB: { type: Number, required: false, default: 0, min: 0, max: 100 },
  version: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: true },
  createdBy: { type: String, required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

// Compound unique index for platform + environment + flagKey + version
FlagSchema.index({ platform: 1, environment: 1, flagKey: 1, version: 1 }, { unique: true });
// Index for finding active version
FlagSchema.index({ platform: 1, environment: 1, flagKey: 1, isActive: 1 });

/**
 * Flag Mongoose model.
 */
export const FlagModel = mongoose.model<IFlagDocument>('Flag', FlagSchema);

/**
 * Experiment document interface for Mongoose.
 */
export interface IExperimentDocument extends Document {
  platform: string;
  environment: string;
  experimentKey: string;
  name: string;
  description?: string;
  hypothesis: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  startedAt?: string;
  completedAt?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  variations: string; // JSON as string
  controlVariation: string;
  trafficAllocation: string; // JSON as string
  targeting: string; // JSON as string
  primaryMetric: string; // JSON as string
  secondaryMetrics: string; // JSON as string
  confidenceLevel: number;
  minimumDetectableEffect?: number;
  minimumSampleSize?: number;
  results?: string; // JSON as string
  winner?: string;
  version: string;
  isActive: boolean;
  createdBy: string;
  startedBy?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Experiment schema with status-based indexes.
 *
 * @remarks
 * **Indexes:**
 * - (platform + environment + experimentKey + version): compound unique index
 * - (platform + environment + status + isActive): for finding experiments by status
 */
const ExperimentSchema = new Schema<IExperimentDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  experimentKey: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: false },
  hypothesis: { type: String, required: true },
  status: { type: String, required: true, enum: ['draft', 'running', 'paused', 'completed', 'archived'] },
  startedAt: { type: String, required: false },
  completedAt: { type: String, required: false },
  scheduledStartAt: { type: String, required: false },
  scheduledEndAt: { type: String, required: false },
  variations: { type: String, required: true }, // JSON as string
  controlVariation: { type: String, required: true },
  trafficAllocation: { type: String, required: true }, // JSON as string
  targeting: { type: String, required: true }, // JSON as string
  primaryMetric: { type: String, required: true }, // JSON as string
  secondaryMetrics: { type: String, required: true }, // JSON as string
  confidenceLevel: { type: Number, required: true },
  minimumDetectableEffect: { type: Number, required: false },
  minimumSampleSize: { type: Number, required: false },
  results: { type: String, required: false }, // JSON as string
  winner: { type: String, required: false },
  version: { type: String, required: true },
  isActive: { type: Boolean, required: true, default: true },
  createdBy: { type: String, required: true },
  startedBy: { type: String, required: false },
  completedBy: { type: String, required: false },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
});

// Compound unique index for platform + environment + experimentKey + version
ExperimentSchema.index({ platform: 1, environment: 1, experimentKey: 1, version: 1 }, { unique: true });
// Index for finding experiments by status
ExperimentSchema.index({ platform: 1, environment: 1, status: 1, isActive: 1 });

/**
 * Experiment Mongoose model.
 */
export const ExperimentModel = mongoose.model<IExperimentDocument>('Experiment', ExperimentSchema);

/**
 * Stats document interface for Mongoose.
 */
export interface IStatsDocument extends Document {
  platform: string;
  environment: string;
  statsType: 'config' | 'flag' | 'flag_country' | 'flag_daily' | 'exp_var' | 'exp_metric';
  key: string; // configKey, flagKey, or experimentKey
  subKey?: string; // country, date, variationKey, or metricId

  // Config stats
  fetchCount?: number;
  lastFetchedAt?: string;
  uniqueClients24h?: number;

  // Flag stats
  totalEvaluations?: number;
  valueACount?: number;
  valueBCount?: number;
  uniqueUsersA24h?: number;
  uniqueUsersB24h?: number;
  lastEvaluatedAt?: string;

  // Flag country stats
  country?: string;

  // Flag daily stats
  date?: string;

  // Experiment stats
  variationKey?: string;
  metricId?: string;
  participants?: number;
  exposures?: number;
  lastExposureAt?: string;
  conversions?: number;
  sampleSize?: number;
  sumValue?: number;
  lastConversionAt?: string;

  updatedAt: string;
}

/**
 * Stats schema with compound indexes for efficient queries.
 *
 * @remarks
 * **Indexes:**
 * - (platform + environment + statsType + key): for main stats lookups
 * - (platform + environment + statsType + key + subKey): for detailed breakdowns
 */
const StatsSchema = new Schema<IStatsDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  statsType: { type: String, required: true, enum: ['config', 'flag', 'flag_country', 'flag_daily', 'exp_var', 'exp_metric'] },
  key: { type: String, required: true },
  subKey: { type: String, required: false },

  // Config stats
  fetchCount: { type: Number, required: false },
  lastFetchedAt: { type: String, required: false },
  uniqueClients24h: { type: Number, required: false },

  // Flag stats
  totalEvaluations: { type: Number, required: false },
  valueACount: { type: Number, required: false },
  valueBCount: { type: Number, required: false },
  uniqueUsersA24h: { type: Number, required: false },
  uniqueUsersB24h: { type: Number, required: false },
  lastEvaluatedAt: { type: String, required: false },

  // Flag country stats
  country: { type: String, required: false },

  // Flag daily stats
  date: { type: String, required: false },

  // Experiment stats
  variationKey: { type: String, required: false },
  metricId: { type: String, required: false },
  participants: { type: Number, required: false },
  exposures: { type: Number, required: false },
  lastExposureAt: { type: String, required: false },
  conversions: { type: Number, required: false },
  sampleSize: { type: Number, required: false },
  sumValue: { type: Number, required: false },
  lastConversionAt: { type: String, required: false },

  updatedAt: { type: String, required: true },
});

// Compound indexes for stats queries
StatsSchema.index({ platform: 1, environment: 1, statsType: 1, key: 1 });
StatsSchema.index({ platform: 1, environment: 1, statsType: 1, key: 1, subKey: 1 });

/**
 * Stats Mongoose model.
 */
export const StatsModel = mongoose.model<IStatsDocument>('Stats', StatsSchema);
