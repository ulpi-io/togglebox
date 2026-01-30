-- Cloudflare D1 Database Schema
-- D1 is SQLite-based, optimized for edge computing

-- Enable foreign key constraints (required for referential integrity)
PRAGMA foreign_keys = ON;

-- ============================================================================
-- PLATFORMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platforms_name ON platforms(name);

-- ============================================================================
-- ENVIRONMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS environments (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  platformId TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL,

  PRIMARY KEY (platform, environment),
  FOREIGN KEY (platformId) REFERENCES platforms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_environments_platformId ON environments(platformId);

-- ============================================================================
-- CONFIG PARAMETERS TABLE (Firebase-style individual versioned parameters)
-- ============================================================================

-- Each config parameter has its own version history.
-- Only one version is active per parameterKey (isActive = 1).
-- "Editing" a parameter creates a new version with incremented version number.
-- Up to 2000 parameters per platform/environment.

CREATE TABLE IF NOT EXISTS config_parameters (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  parameterKey TEXT NOT NULL,
  version TEXT NOT NULL, -- "1", "2", "3" - auto-incremented on edit

  valueType TEXT NOT NULL, -- 'string' | 'number' | 'boolean' | 'json'
  defaultValue TEXT NOT NULL, -- All values stored as strings, parsed by valueType

  description TEXT,
  parameterGroup TEXT,

  isActive INTEGER NOT NULL DEFAULT 1, -- Only one version active per parameterKey

  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL, -- ISO-8601 timestamp

  PRIMARY KEY (platform, environment, parameterKey, version)
);

-- Index for getConfigs/listActive queries (active parameters only)
CREATE INDEX IF NOT EXISTS idx_config_parameters_active ON config_parameters(platform, environment, isActive);
-- Index for listVersions queries
CREATE INDEX IF NOT EXISTS idx_config_parameters_key ON config_parameters(platform, environment, parameterKey);
-- Index for listByGroup queries
CREATE INDEX IF NOT EXISTS idx_config_parameters_group ON config_parameters(platform, environment, parameterGroup);

-- ============================================================================
-- FEATURE FLAGS TABLE (Versioned)
-- ============================================================================

-- Feature flags are now versioned and immutable.
-- Each flag can have multiple versions identified by versionLabel (e.g., "1.0.0").
-- Only one version can be active per flagName (isActive = 1).
-- "Editing" creates a new version with bumped versionLabel.

CREATE TABLE IF NOT EXISTS feature_flags (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  flagName TEXT NOT NULL,
  versionLabel TEXT NOT NULL DEFAULT '1.0.0',
  platformId TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1, -- SQLite uses 0/1 for boolean
  enabled INTEGER NOT NULL DEFAULT 0, -- SQLite uses 0/1 for boolean
  description TEXT,
  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,

  -- Typed variation fields (LaunchDarkly-style)
  flagType TEXT NOT NULL DEFAULT 'boolean', -- boolean, string, number, json
  variations TEXT NOT NULL DEFAULT '[{"name":"on","value":true},{"name":"off","value":false}]', -- JSON array
  defaultVariation TEXT NOT NULL DEFAULT 'off', -- Name of variation when flag is "off"
  onVariation TEXT NOT NULL DEFAULT 'on', -- Name of variation when flag is "on"

  -- Phased rollout fields (JSON arrays stored as text)
  rolloutType TEXT NOT NULL DEFAULT 'simple',
  rolloutPercentage INTEGER,
  targetUserIds TEXT NOT NULL DEFAULT '[]',
  excludeUserIds TEXT NOT NULL DEFAULT '[]',
  targetCountries TEXT NOT NULL DEFAULT '[]',
  targetLanguages TEXT NOT NULL DEFAULT '[]',
  targetPlatformVersions TEXT NOT NULL DEFAULT '[]',

  PRIMARY KEY (platform, environment, flagName, versionLabel),
  FOREIGN KEY (platformId) REFERENCES platforms(id) ON DELETE CASCADE,
  FOREIGN KEY (platform, environment) REFERENCES environments(platform, environment) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_platformId ON feature_flags(platformId);
CREATE INDEX IF NOT EXISTS idx_feature_flags_env ON feature_flags(platform, environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_active ON feature_flags(platform, environment, isActive);
CREATE INDEX IF NOT EXISTS idx_feature_flags_versions ON feature_flags(platform, environment, flagName);

-- ============================================================================
-- USAGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage (
  tenant_id TEXT PRIMARY KEY NOT NULL,
  api_requests INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant ON usage(tenant_id);

-- ============================================================================
-- FLAGS TABLE (Three-Tier Architecture - Tier 2)
-- ============================================================================

-- New 2-value feature flag model with country/language targeting
-- Distinct from the legacy feature_flags table

CREATE TABLE IF NOT EXISTS flags (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  flagKey TEXT NOT NULL,
  version TEXT NOT NULL, -- Semantic version (e.g., "1.0.0")

  name TEXT NOT NULL,
  description TEXT,
  enabled INTEGER NOT NULL DEFAULT 0, -- Master switch (SQLite boolean)

  -- Type & Values (EXACTLY 2 values - A/B)
  flagType TEXT NOT NULL DEFAULT 'boolean', -- boolean, string, number
  valueA TEXT NOT NULL, -- JSON-encoded value
  valueB TEXT NOT NULL, -- JSON-encoded value

  -- Targeting (JSON-encoded)
  targeting TEXT NOT NULL DEFAULT '{}', -- JSON: {countries: [], forceIncludeUsers: [], forceExcludeUsers: []}
  defaultValue TEXT NOT NULL DEFAULT 'B', -- 'A' or 'B'

  -- Versioning
  isActive INTEGER NOT NULL DEFAULT 1, -- SQLite boolean

  -- Audit
  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL, -- ISO-8601 timestamp
  updatedAt TEXT NOT NULL, -- ISO-8601 timestamp

  PRIMARY KEY (platform, environment, flagKey, version)
);

CREATE INDEX IF NOT EXISTS idx_flags_active ON flags(platform, environment, isActive);
CREATE INDEX IF NOT EXISTS idx_flags_key ON flags(platform, environment, flagKey);

-- ============================================================================
-- EXPERIMENTS TABLE (Three-Tier Architecture - Tier 3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS experiments (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  experimentKey TEXT NOT NULL,
  version TEXT NOT NULL, -- Semantic version

  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT NOT NULL,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft', -- draft, running, paused, completed, archived
  startedAt TEXT,
  completedAt TEXT,
  scheduledStartAt TEXT,
  scheduledEndAt TEXT,

  -- Variations & Traffic (JSON-encoded)
  variations TEXT NOT NULL, -- JSON array
  controlVariation TEXT NOT NULL, -- Key of control variation
  trafficAllocation TEXT NOT NULL, -- JSON array

  -- Targeting (JSON-encoded)
  targeting TEXT NOT NULL DEFAULT '{}',

  -- Metrics (JSON-encoded)
  primaryMetric TEXT NOT NULL, -- JSON object
  secondaryMetrics TEXT, -- JSON array

  -- Statistical configuration
  confidenceLevel REAL NOT NULL DEFAULT 0.95,
  minimumDetectableEffect REAL,
  minimumSampleSize INTEGER,

  -- Results (JSON-encoded, computed)
  results TEXT,
  winner TEXT, -- Variation key

  -- Versioning
  isActive INTEGER NOT NULL DEFAULT 1,

  -- Audit
  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,

  PRIMARY KEY (platform, environment, experimentKey, version)
);

CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(platform, environment, status);
CREATE INDEX IF NOT EXISTS idx_experiments_active ON experiments(platform, environment, isActive);
CREATE INDEX IF NOT EXISTS idx_experiments_key ON experiments(platform, environment, experimentKey);

-- ============================================================================
-- STATS TABLES (Three-Tier Architecture)
-- ============================================================================

-- Config Stats
CREATE TABLE IF NOT EXISTS config_stats (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  configKey TEXT NOT NULL,

  fetchCount INTEGER NOT NULL DEFAULT 0,
  lastFetchedAt TEXT,
  uniqueClients24h INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL,

  PRIMARY KEY (platform, environment, configKey)
);

-- Flag Stats
CREATE TABLE IF NOT EXISTS flag_stats (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  flagKey TEXT NOT NULL,

  totalEvaluations INTEGER NOT NULL DEFAULT 0,
  valueACount INTEGER NOT NULL DEFAULT 0,
  valueBCount INTEGER NOT NULL DEFAULT 0,
  uniqueUsersA24h INTEGER NOT NULL DEFAULT 0,
  uniqueUsersB24h INTEGER NOT NULL DEFAULT 0,
  lastEvaluatedAt TEXT,
  updatedAt TEXT NOT NULL,

  PRIMARY KEY (platform, environment, flagKey)
);

-- Daily Flag Stats
CREATE TABLE IF NOT EXISTS flag_stats_daily (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  flagKey TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD

  valueACount INTEGER NOT NULL DEFAULT 0,
  valueBCount INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (platform, environment, flagKey, date)
);

-- Country breakdown for Flags
CREATE TABLE IF NOT EXISTS flag_stats_by_country (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  flagKey TEXT NOT NULL,
  country TEXT NOT NULL, -- ISO-3166 2-letter code

  valueACount INTEGER NOT NULL DEFAULT 0,
  valueBCount INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (platform, environment, flagKey, country)
);

-- Experiment Variation Stats
CREATE TABLE IF NOT EXISTS experiment_variation_stats (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  experimentKey TEXT NOT NULL,
  variationKey TEXT NOT NULL,

  participants INTEGER NOT NULL DEFAULT 0,
  exposures INTEGER NOT NULL DEFAULT 0,
  lastExposureAt TEXT,
  updatedAt TEXT NOT NULL,

  PRIMARY KEY (platform, environment, experimentKey, variationKey)
);

-- Daily Experiment Stats
CREATE TABLE IF NOT EXISTS experiment_stats_daily (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  experimentKey TEXT NOT NULL,
  variationKey TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD

  participants INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (platform, environment, experimentKey, variationKey, date)
);

-- Experiment Metric Stats
CREATE TABLE IF NOT EXISTS experiment_metric_stats (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  experimentKey TEXT NOT NULL,
  variationKey TEXT NOT NULL,
  metricId TEXT NOT NULL,

  sampleSize INTEGER NOT NULL DEFAULT 0,
  sumValue REAL NOT NULL DEFAULT 0,
  count INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  lastConversionAt TEXT,
  updatedAt TEXT NOT NULL,

  PRIMARY KEY (platform, environment, experimentKey, variationKey, metricId)
);

-- Daily Metric Stats
CREATE TABLE IF NOT EXISTS experiment_metric_stats_daily (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  experimentKey TEXT NOT NULL,
  variationKey TEXT NOT NULL,
  metricId TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD

  sampleSize INTEGER NOT NULL DEFAULT 0,
  sumValue REAL NOT NULL DEFAULT 0,
  count INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (platform, environment, experimentKey, variationKey, metricId, date)
);

-- ============================================================================
-- INITIALIZATION NOTES
-- ============================================================================

-- To initialize this schema in D1:
--
-- 1. Create a D1 database:
--    wrangler d1 create remote-config-db
--
-- 2. Apply the schema:
--    wrangler d1 execute remote-config-db --file=./schema.sql
--
-- 3. Verify tables:
--    wrangler d1 execute remote-config-db --command="SELECT name FROM sqlite_master WHERE type='table';"
--
-- 4. For local development:
--    wrangler d1 execute remote-config-db --local --file=./schema.sql
