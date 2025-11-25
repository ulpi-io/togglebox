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
-- CONFIG VERSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS config_versions (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  versionTimestamp TEXT NOT NULL,
  platformId TEXT NOT NULL,
  versionLabel TEXT,
  isStable INTEGER NOT NULL DEFAULT 0, -- SQLite uses 0/1 for boolean
  config TEXT NOT NULL, -- JSON stored as text
  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,

  PRIMARY KEY (platform, environment, versionTimestamp),
  FOREIGN KEY (platformId) REFERENCES platforms(id) ON DELETE CASCADE,
  FOREIGN KEY (platform, environment) REFERENCES environments(platform, environment) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_config_versions_platformId ON config_versions(platformId);
CREATE INDEX IF NOT EXISTS idx_config_versions_stable ON config_versions(platform, environment, isStable);

-- ============================================================================
-- FEATURE FLAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  platform TEXT NOT NULL,
  environment TEXT NOT NULL,
  flagName TEXT NOT NULL,
  platformId TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0, -- SQLite uses 0/1 for boolean
  description TEXT,
  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT,

  -- Phased rollout fields (JSON arrays stored as text)
  rolloutType TEXT NOT NULL DEFAULT 'simple',
  rolloutPercentage INTEGER,
  targetUserIds TEXT NOT NULL DEFAULT '[]',
  excludeUserIds TEXT NOT NULL DEFAULT '[]',
  targetCountries TEXT NOT NULL DEFAULT '[]',
  targetLanguages TEXT NOT NULL DEFAULT '[]',

  PRIMARY KEY (platform, environment, flagName),
  FOREIGN KEY (platformId) REFERENCES platforms(id) ON DELETE CASCADE,
  FOREIGN KEY (platform, environment) REFERENCES environments(platform, environment) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_platformId ON feature_flags(platformId);
CREATE INDEX IF NOT EXISTS idx_feature_flags_env ON feature_flags(platform, environment);

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
