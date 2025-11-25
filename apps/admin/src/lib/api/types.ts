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
  name: string; // Alias for environment
  description?: string;
  createdAt: string;
}

// Config types
export interface ConfigVersion {
  platform: string;
  environment: string;
  versionTimestamp: string;
  versionLabel?: string;
  version: string; // Semantic version (e.g., "1.0.0")
  isStable: boolean;
  config: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

// Feature flag types
export type RolloutType = 'simple' | 'percentage' | 'targeted';

export interface FeatureFlag {
  platform: string;
  environment: string;
  flagName: string;
  enabled: boolean;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  rolloutType: RolloutType;
  rolloutPercentage?: number;
  targetUserIds?: string[];
  excludeUserIds?: string[];
  targetCountries?: string[];
  targetLanguages?: string[];
}

// Evaluation types
export interface EvaluationContext {
  userId?: string;
  country?: string;
  language?: string;
}

export interface EvaluationResult {
  enabled: boolean;
  reason?: string;
  flagName?: string;
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
