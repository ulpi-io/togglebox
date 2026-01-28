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
  createdBy?: string;
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
  createdBy: { type: String, required: false },
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
  createdBy?: string;
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
  createdBy: { type: String, required: false },
  createdAt: { type: String, required: true },
});

// Compound unique index for platform + environment
EnvironmentSchema.index({ platform: 1, environment: 1 }, { unique: true });

/**
 * Environment Mongoose model.
 */
export const EnvironmentModel = mongoose.model<IEnvironmentDocument>('Environment', EnvironmentSchema);

/**
 * Config parameter document interface for Mongoose.
 *
 * @remarks
 * Firebase-style individual versioned config parameters.
 * Each parameter has its own version history.
 */
export interface IConfigParameterDocument extends Document {
  platform: string;
  environment: string;
  parameterKey: string;
  version: string; // "1", "2", "3" - auto-incremented on edit
  valueType: 'string' | 'number' | 'boolean' | 'json';
  defaultValue: string; // All values stored as strings, parsed by valueType
  description?: string;
  parameterGroup?: string;
  isActive: boolean; // Only one version active per parameterKey
  createdBy: string;
  createdAt: string;
}

/**
 * Config parameter schema with version history support.
 *
 * @remarks
 * **Indexes:**
 * - (platform + environment + parameterKey + version): compound unique index - PRIMARY KEY
 * - (platform + environment + isActive): for getConfigs/listActive queries
 * - (platform + environment + parameterKey): for listVersions queries
 * - (platform + environment + parameterGroup): for listByGroup queries
 *
 * **Versioning:**
 * Each edit creates a new version. Only one version is active per parameterKey.
 * Use isActive flag to track which version is current.
 */
const ConfigParameterSchema = new Schema<IConfigParameterDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  parameterKey: { type: String, required: true },
  version: { type: String, required: true },
  valueType: { type: String, required: true, enum: ['string', 'number', 'boolean', 'json'] },
  defaultValue: { type: String, required: true },
  description: { type: String, required: false },
  parameterGroup: { type: String, required: false },
  isActive: { type: Boolean, required: true, default: true },
  createdBy: { type: String, required: true },
  createdAt: { type: String, required: true },
});

// Compound unique index for platform + environment + parameterKey + version (PRIMARY KEY)
ConfigParameterSchema.index({ platform: 1, environment: 1, parameterKey: 1, version: 1 }, { unique: true });
// Index for getConfigs/listActive queries (active parameters only) with sort field
ConfigParameterSchema.index({ platform: 1, environment: 1, isActive: 1, parameterKey: 1 });
// Index for listVersions queries with sort by version descending
ConfigParameterSchema.index({ platform: 1, environment: 1, parameterKey: 1, version: -1 });
// Index for listByGroup queries with sort field
ConfigParameterSchema.index({ platform: 1, environment: 1, parameterGroup: 1, parameterKey: 1 });

/**
 * Config parameter Mongoose model.
 */
export const ConfigParameterModel = mongoose.model<IConfigParameterDocument>('ConfigParameter', ConfigParameterSchema);

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
// Index for finding active version with sort support
FlagSchema.index({ platform: 1, environment: 1, flagKey: 1, isActive: 1, version: -1 });
// Index for listing all active flags in an environment
FlagSchema.index({ platform: 1, environment: 1, isActive: 1, flagKey: 1 });

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
// Index for finding experiments by status with sort support
ExperimentSchema.index({ platform: 1, environment: 1, status: 1, isActive: 1, createdAt: -1 });
// Index for listing all active experiments
ExperimentSchema.index({ platform: 1, environment: 1, isActive: 1, experimentKey: 1 });

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
  count?: number;
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
  count: { type: Number, required: false },
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

/**
 * Custom Event document interface for Mongoose.
 */
export interface ICustomEventDocument extends Document {
  platform: string;
  environment: string;
  eventName: string;
  userId?: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Custom Event schema.
 */
const CustomEventSchema = new Schema<ICustomEventDocument>({
  platform: { type: String, required: true },
  environment: { type: String, required: true },
  eventName: { type: String, required: true },
  userId: { type: String, required: false },
  properties: { type: Schema.Types.Mixed, required: false },
  timestamp: { type: String, required: true },
});

// Compound indexes for custom event queries
CustomEventSchema.index({ platform: 1, environment: 1, eventName: 1 });
CustomEventSchema.index({ platform: 1, environment: 1, timestamp: -1 });

/**
 * CustomEvent Mongoose model.
 */
export const CustomEventModel = mongoose.model<ICustomEventDocument>('CustomEvent', CustomEventSchema);
