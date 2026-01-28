# Plan: Redesign Tier 1 Remote Configs (Firebase-Style)

## Goal

Replace the current "versioned JSON blob" model with individual config parameters like Firebase Remote Config.

---

## Current vs Target Model

### Current Model (ToggleBox)
```
Platform → Environment → Version → ONE JSON blob
```
- One blob contains all config values
- Versioning is per-blob (deploy entire config at once)
- No individual parameter targeting/conditions

### Target Model (Firebase-Style)
```
Platform → Environment → MANY Config Parameters
                       → Conditions (targeting rules)
                       → Template Versions (snapshots)
```
- Many individual parameters (up to 2000 per environment)
- Each parameter has its own key, value, type, and conditions
- Template versioning (snapshot all parameters at once for rollback)

---

## Phase 1: Data Model

### 1.1 New Schema: `ConfigParameter`

```typescript
// packages/configs/src/schemas.ts

export const ConfigParameterSchema = z.object({
  // Identity
  platform: z.string(),
  environment: z.string(),
  parameterKey: z.string()
    .min(1)
    .max(256)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Must start with letter or underscore'),

  // Value
  valueType: z.enum(['string', 'number', 'boolean', 'json']),
  defaultValue: z.string(), // All values stored as strings, parsed by type

  // Metadata
  description: z.string().max(500).optional(),
  parameterGroup: z.string().max(100).optional(), // For organizing in UI

  // NOTE: No conditionalValues - users handle targeting via JSON structure in defaultValue

  // Audit
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedBy: z.string(),
  updatedAt: z.string().datetime(),
});

export type ConfigParameter = z.infer<typeof ConfigParameterSchema>;
```

### 1.2 ~~Conditions~~ (REMOVED)

**Decision:** Conditions/targeting removed for simplicity. Users who need per-country or per-language configs can store JSON values with keys for each variant:

```json
// Example: User stores theme config with country variants in a single parameter
{
  "parameterKey": "theme_config",
  "valueType": "json",
  "defaultValue": "{\"US\": {\"primary\": \"#007AFF\"}, \"UK\": {\"primary\": \"#1E90FF\"}, \"default\": {\"primary\": \"#0066CC\"}}"
}

// Client code handles targeting:
const themes = JSON.parse(await client.getConfigValue('theme_config', '{}'));
const theme = themes[userCountry] || themes.default;
```

### 1.3 New Schema: `ConfigTemplate` (for versioning/rollback)

```typescript
export const ConfigTemplateSchema = z.object({
  // Identity
  platform: z.string(),
  environment: z.string(),
  templateVersion: z.number().int(), // Auto-incrementing

  // Snapshot of all parameters at this version
  parameters: z.array(ConfigParameterSchema),
  // NOTE: No conditions - removed for simplicity

  // Metadata
  description: z.string().max(500).optional(),

  // Audit
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});

export type ConfigTemplate = z.infer<typeof ConfigTemplateSchema>;
```

---

## Phase 2: Database Changes

### 2.1 New Tables/Collections

#### Prisma Schema (SQL)
```prisma
model ConfigParameter {
  platform        String
  environment     String
  parameterKey    String

  valueType       String   // 'string' | 'number' | 'boolean' | 'json'
  defaultValue    String
  description     String?
  parameterGroup  String?
  conditionalValues String  @default("[]") // JSON array

  createdBy       String
  createdAt       String
  updatedBy       String
  updatedAt       String

  @@id([platform, environment, parameterKey])
  @@index([platform, environment, parameterGroup])
  @@map("config_parameters")
}

// NOTE: ConfigCondition model REMOVED - no conditions in simplified design

model ConfigTemplate {
  platform        String
  environment     String
  templateVersion Int

  parameters      String  // JSON snapshot of all parameters
  description     String?

  createdBy       String
  createdAt       String

  @@id([platform, environment, templateVersion])
  @@index([platform, environment])
  @@map("config_templates")
}
```

#### DynamoDB Single-Table Design
```
PK: PLATFORM#{platform}
SK: ENV#{environment}#PARAM#{parameterKey}

PK: PLATFORM#{platform}
SK: ENV#{environment}#TEMPLATE#{templateVersion}

// NOTE: No CONDITION entries - removed for simplicity
```

### 2.2 Repository Interface

```typescript
// packages/database/src/interfaces/IConfigParameterRepository.ts

export interface IConfigParameterRepository {
  // Parameters
  createParameter(param: Omit<ConfigParameter, 'createdAt' | 'updatedAt'>): Promise<ConfigParameter>;
  getParameter(platform: string, environment: string, key: string): Promise<ConfigParameter | null>;
  listParameters(platform: string, environment: string): Promise<ConfigParameter[]>;
  updateParameter(platform: string, environment: string, key: string, updates: Partial<ConfigParameter>): Promise<ConfigParameter | null>;
  deleteParameter(platform: string, environment: string, key: string): Promise<boolean>;

  // NOTE: Condition methods REMOVED - no conditions in simplified design

  // Templates (versioning)
  createTemplate(platform: string, environment: string, createdBy: string, description?: string): Promise<ConfigTemplate>;
  getTemplate(platform: string, environment: string, version: number): Promise<ConfigTemplate | null>;
  getLatestTemplate(platform: string, environment: string): Promise<ConfigTemplate | null>;
  listTemplates(platform: string, environment: string, limit?: number): Promise<ConfigTemplate[]>;
  rollbackToTemplate(platform: string, environment: string, version: number, createdBy: string): Promise<ConfigTemplate>;
}
```

---

## Phase 3: API Endpoints

### 3.1 Parameter Endpoints

```
# Public (SDK clients)
GET  /platforms/:platform/environments/:env/configs
     → List all parameters (returns array of {key, value, valueType})

GET  /platforms/:platform/environments/:env/configs/:parameterKey
     → Get single parameter with evaluated value (considers conditions + context)
     → Query params: ?userId=...&country=...&language=...

# Internal (Admin)
POST   /internal/platforms/:platform/environments/:env/configs
       → Create parameter
       → Body: { parameterKey, valueType, defaultValue, description?, conditionalValues? }

PUT    /internal/platforms/:platform/environments/:env/configs/:parameterKey
       → Update parameter

DELETE /internal/platforms/:platform/environments/:env/configs/:parameterKey
       → Delete parameter
```

### 3.2 ~~Condition Endpoints~~ (REMOVED)

No condition endpoints - conditions removed for simplicity.

### 3.3 Template (Versioning) Endpoints

```
GET  /internal/platforms/:platform/environments/:env/templates
     → List template versions (history)

GET  /internal/platforms/:platform/environments/:env/templates/:version
     → Get specific template snapshot

POST /internal/platforms/:platform/environments/:env/templates
     → Create new template (snapshot current state)
     → Body: { description? }

POST /internal/platforms/:platform/environments/:env/templates/:version/rollback
     → Rollback to specific template version
```

---

## Phase 4: SDK Changes

### 4.1 New Client Methods

```typescript
// packages/sdk-js/src/client.ts

class ToggleBoxClient {
  // ==================== TIER 1: REMOTE CONFIGS (NEW) ====================

  /**
   * Get a single config parameter value.
   * No condition evaluation - returns defaultValue directly.
   * Users handle any targeting logic in their app code.
   */
  async getConfigValue<T extends string | number | boolean | object>(
    key: string,
    defaultValue: T
  ): Promise<T> {
    const params = await this.getAllConfigParameters();
    const param = params.find(p => p.parameterKey === key);

    if (!param) return defaultValue;

    return this.parseValue(param.defaultValue, param.valueType) as T;
  }

  /**
   * Get all config parameters.
   * Cached locally, refreshed on polling interval.
   */
  async getAllConfigParameters(): Promise<ConfigParameter[]> {
    const cacheKey = `configs:${this.platform}:${this.environment}`;

    let params = this.cache.get<ConfigParameter[]>(cacheKey);
    if (!params) {
      const response = await this.http.get<{ data: ConfigParameter[] }>(
        `/api/v1/platforms/${this.platform}/environments/${this.environment}/configs`
      );
      params = response.data;
      this.cache.set(cacheKey, params);
    }

    return params;
  }

  /**
   * Get all config values as a key-value object.
   * Convenience method for getting all configs at once.
   * No condition evaluation - returns all default values.
   */
  async getAllConfigs(): Promise<Record<string, unknown>> {
    const params = await this.getAllConfigParameters();
    const result: Record<string, unknown> = {};

    for (const param of params) {
      result[param.parameterKey] = this.parseValue(param.defaultValue, param.valueType);
    }

    return result;
  }

  // NOTE: evaluateParameter and evaluateCondition methods REMOVED
  // Users handle any targeting logic in their app code

  /**
   * Parse string value to typed value.
   */
  private parseValue(value: string, valueType: string): unknown {
    switch (valueType) {
      case 'boolean': return value === 'true';
      case 'number': return parseFloat(value);
      case 'json': return JSON.parse(value);
      default: return value;
    }
  }
}
```

### 4.2 ~~ConfigContext Type~~ (REMOVED)

No ConfigContext needed - conditions removed for simplicity.
Users handle any targeting logic in their app code by parsing JSON values.

---

## Phase 5: Migration Strategy

### 5.1 Backward Compatibility

Keep the old "versioned blob" API working during migration:
- Old endpoints: `/versions/latest/stable` → returns blob
- New endpoints: `/configs` → returns individual parameters

### 5.2 Migration Script

```typescript
// scripts/migrate-configs-to-parameters.ts

async function migrateVersionToParameters(
  platform: string,
  environment: string,
  version: Version
) {
  const { config } = version;

  // Flatten nested config to individual parameters
  const parameters = flattenConfig(config);

  for (const [key, value] of Object.entries(parameters)) {
    await db.configParameter.create({
      platform,
      environment,
      parameterKey: key,
      valueType: inferType(value),
      defaultValue: JSON.stringify(value),
      createdBy: version.createdBy,
    });
  }
}

function flattenConfig(obj: object, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenConfig(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}
```

### 5.3 Deprecation Timeline

1. **v1.x**: Both models supported, old model deprecated
2. **v2.0**: Old "versioned blob" endpoints removed

---

## Phase 6: Limits & Validation

### 6.1 System Limits (Firebase-aligned)

| Resource | Limit |
|----------|-------|
| Parameters per environment | 2000 |
| Parameter key length | 256 characters |
| Parameter value length | 10,000 characters |
| Total parameter values size | 1,000,000 characters |
| Template versions retained | 300 |

NOTE: No conditions limits - conditions removed for simplicity.

### 6.2 Validation Rules

```typescript
const LIMITS = {
  MAX_PARAMETERS_PER_ENV: 2000,
  MAX_KEY_LENGTH: 256,
  MAX_VALUE_LENGTH: 10_000,
  MAX_TOTAL_VALUES_SIZE: 1_000_000,
  MAX_TEMPLATES_RETAINED: 300,
};

// NOTE: No condition limits - conditions removed for simplicity
```

---

## Phase 7: Implementation Order

### Step 1: Schema & Types (1-2 days) ✅ COMPLETE
- [x] Add new Zod schemas to `@togglebox/configs`
- [x] Export new types
- [x] Add validation helpers

### Step 2: Database Layer (2-3 days)
- [ ] Add Prisma schema for SQL databases
- [ ] Implement DynamoDB adapter
- [ ] Implement repository interface
- [ ] Add database migrations

### Step 3: API Endpoints (2-3 days)
- [ ] Create `configParameterController.ts`
- [ ] Add public routes (`/configs`, `/configs/:key`)
- [ ] Add internal routes (CRUD)
- [ ] Add condition routes
- [ ] Add template routes

### Step 4: SDK Changes (2-3 days)
- [ ] Update `@togglebox/sdk` with new methods
- [ ] Update `@togglebox/sdk-nextjs`
- [ ] Update `@togglebox/sdk-expo`
- [ ] Add condition evaluation logic

### Step 5: Migration & Docs (1-2 days)
- [ ] Write migration script
- [ ] Update example apps
- [ ] Update documentation
- [ ] Add deprecation warnings to old endpoints

---

## Summary

| Component | Change |
|-----------|--------|
| Data Model | Blob → Individual parameters |
| Targeting | None → User-managed via JSON values (no conditions) |
| Versioning | Per-blob → Template snapshots |
| API | `/versions` → `/configs` + `/templates` |
| SDK | `getConfig()` → `getConfigValue()` + `getAllConfigs()` |
| Limits | 300KB blob → 2000 params |

---

## Decisions Made

1. **Keep old blob API?** → **Clean break** - remove old versioned blob API
2. **Condition complexity?** → **No conditions** - users handle targeting via JSON values
3. **Real-time updates?** → Polling only for MVP
4. **Parameter groups?** → Skip for MVP
