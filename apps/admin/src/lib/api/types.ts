// User types
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

// Auth response
export interface AuthResponse {
  user: User;
  token: string;
}

// Platform types
export interface Platform {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

// Environment types
export interface Environment {
  platform: string;
  environment: string;
  description?: string;
  createdAt: string;
}

// Config types
export interface ConfigVersion {
  platform: string;
  environment: string;
  versionTimestamp: string; // Unique identifier (ISO-8601 timestamp)
  versionLabel: string; // Semantic version for display (e.g., "1.0.0")
  isStable: boolean;
  config: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

/**
 * Flag types - Three-Tier Architecture, Tier 2: Feature Flags
 * 2-value model (valueA/valueB) with country/language targeting.
 */
export type FlagType = 'boolean' | 'string' | 'number';
export type FlagValue = boolean | string | number;

export interface FlagLanguageTarget {
  language: string;
  serveValue: 'A' | 'B';
}

export interface FlagCountryTarget {
  country: string;
  serveValue: 'A' | 'B';
  languages?: FlagLanguageTarget[];
}

export interface FlagTargeting {
  countries: FlagCountryTarget[];
  forceIncludeUsers: string[];
  forceExcludeUsers: string[];
}

export interface Flag {
  platform: string;
  environment: string;
  flagKey: string;
  name: string;
  description?: string;
  enabled: boolean;
  flagType: FlagType;
  valueA: FlagValue;
  valueB: FlagValue;
  targeting: FlagTargeting;
  defaultValue: 'A' | 'B';
  version: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Evaluation types
export interface EvaluationContext {
  userId?: string;
  country?: string;
  language?: string;
}

export interface FlagEvaluationResult {
  flagKey: string;
  enabled: boolean;
  variant: 'A' | 'B';
  value: FlagValue;
  reason: string;
}

// API Key types
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyLast4: string;
  permissions: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiKeyWithPlaintext extends Omit<ApiKey, 'keyPrefix' | 'keyLast4'> {
  key: string; // Full plaintext key (shown once)
}

// Cache invalidation types
export interface CacheInvalidation {
  platform?: string;
  environment?: string;
  version?: string;
  global?: boolean;
}

export interface InvalidationStatus {
  id: string;
  status: 'InProgress' | 'Completed';
  createTime: string;
  paths: string[];
}

/**
 * Experiment types - Three-Tier Architecture, Tier 3: A/B Testing
 * Multi-variant experiments with statistical analysis.
 */
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';
export type MetricType = 'conversion' | 'count' | 'sum' | 'average';
export type SuccessDirection = 'increase' | 'decrease';
export type ResultStatus = 'collecting' | 'significant' | 'not_significant' | 'inconclusive';

export interface ExperimentVariation {
  key: string;
  name: string;
  value: unknown;
  isControl: boolean;
}

export interface TrafficAllocation {
  variationKey: string;
  percentage: number;
}

export interface LanguageTarget {
  language: string;
}

export interface CountryTarget {
  country: string;
  languages?: LanguageTarget[];
}

export interface ExperimentTargeting {
  countries?: CountryTarget[];
  forceIncludeUsers?: string[];
  forceExcludeUsers?: string[];
}

export interface ExperimentMetric {
  id: string;
  name: string;
  eventName: string;
  metricType: MetricType;
  successDirection: SuccessDirection;
  valueProperty?: string;
}

export interface VariationResult {
  variationKey: string;
  participants: number;
  conversions: number;
  conversionRate: number;
  relativeLift?: number;
  confidenceInterval?: [number, number];
}

export interface ExperimentResults {
  status: ResultStatus;
  lastUpdatedAt: string;
  totalParticipants: number;
  totalConversions: number;
  variations: VariationResult[];
  pValue?: number;
  isSignificant: boolean;
  sampleRatioMismatch?: boolean;
  warnings?: string[];
}

export interface Experiment {
  platform: string;
  environment: string;
  experimentKey: string;
  name: string;
  description?: string;
  hypothesis: string;
  status: ExperimentStatus;
  startedAt?: string;
  completedAt?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  variations: ExperimentVariation[];
  controlVariation: string;
  trafficAllocation: TrafficAllocation[];
  targeting: ExperimentTargeting;
  primaryMetric: ExperimentMetric;
  secondaryMetrics?: ExperimentMetric[];
  confidenceLevel: number;
  minimumDetectableEffect?: number;
  minimumSampleSize?: number;
  results?: ExperimentResults;
  winner?: string;
  version: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VariantAssignment {
  experimentKey: string;
  variationKey: string;
  value: unknown;
  isControl: boolean;
  reason: string;
}
