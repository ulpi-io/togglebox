// User types
export interface User {
  id: string;
  name?: string;
  email: string;
  role: "admin" | "developer" | "viewer";
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
  createdBy?: string;
  createdAt: string;
}

// Environment types
export interface Environment {
  platform: string;
  environment: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
}

// Config Parameter types (Firebase-style individual parameters)
export type ConfigValueType = "string" | "number" | "boolean" | "json";

export interface ConfigParameter {
  platform: string;
  environment: string;
  parameterKey: string;
  version: string; // "1", "2", "3" - per-parameter versioning
  valueType: ConfigValueType;
  defaultValue: string; // Stored as string, parsed based on valueType
  description?: string;
  parameterGroup?: string; // For organizing parameters in UI
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

/**
 * Flag types - Three-Tier Architecture, Tier 2: Feature Flags
 * 2-value model (valueA/valueB) with country/language targeting.
 */
export type FlagType = "boolean" | "string" | "number";
export type FlagValue = boolean | string | number;

export interface FlagLanguageTarget {
  language: string;
  serveValue: "A" | "B";
}

export interface FlagCountryTarget {
  country: string;
  serveValue: "A" | "B";
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
  defaultValue: "A" | "B";
  // Rollout settings for gradual feature rollouts
  rolloutEnabled?: boolean;
  rolloutPercentageA?: number; // 0-100
  rolloutPercentageB?: number; // 0-100
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
  variant: "A" | "B";
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

export interface ApiKeyWithPlaintext extends Omit<
  ApiKey,
  "keyPrefix" | "keyLast4"
> {
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
  status: "InProgress" | "Completed";
  createTime: string;
  paths: string[];
}

/**
 * Experiment types - Three-Tier Architecture, Tier 3: A/B Testing
 * Multi-variant experiments with statistical analysis.
 */
export type ExperimentStatus =
  | "draft"
  | "running"
  | "paused"
  | "completed"
  | "archived";
export type MetricType = "conversion" | "count" | "sum" | "average";
export type SuccessDirection = "increase" | "decrease";
export type ResultStatus =
  | "collecting"
  | "significant"
  | "not_significant"
  | "inconclusive";

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

// Stats types
export interface FlagStats {
  platform: string;
  environment: string;
  flagKey: string;
  totalEvaluations: number;
  valueACount: number;
  valueBCount: number;
  uniqueUsersA24h: number;
  uniqueUsersB24h: number;
  updatedAt: string | null;
}

export interface FlagCountryStats {
  country: string;
  totalEvaluations: number;
  valueACount: number;
  valueBCount: number;
}

export interface FlagDailyStats {
  date: string;
  totalEvaluations: number;
  valueACount: number;
  valueBCount: number;
}
