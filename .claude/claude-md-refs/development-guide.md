# Development Guide

## Adding a New API Endpoint

### Step 1: Choose the Right Router

| Router           | File                       | Auth                       | Use For                                 |
| ---------------- | -------------------------- | -------------------------- | --------------------------------------- |
| `publicRouter`   | `routes/publicRoutes.ts`   | `conditionalAuth()`        | Read-only GET endpoints for SDK clients |
| `internalRouter` | `routes/internalRoutes.ts` | `requireAuth()`            | All mutations (POST/PUT/PATCH/DELETE)   |
| `authRouter`     | Via `@togglebox/auth`      | None / `conditionalAuth()` | Login, register, password reset         |

### Step 2: Route Ordering Rules

**Critical:** Place specific routes BEFORE parameterized routes to avoid matching conflicts:

```typescript
// CORRECT - /list comes BEFORE /:key
router.get("/configs/list", handler); // Handles /configs/list
router.get("/configs/count", handler); // Handles /configs/count
router.get("/configs/:parameterKey", handler); // Handles /configs/theme

// WRONG - "list" would be matched as parameterKey
router.get("/configs/:parameterKey", handler);
router.get("/configs/list", handler); // Never reached!
```

**Health endpoints** must come BEFORE auth middleware:

```typescript
// Health check - always unauthenticated for monitoring
publicRouter.get("/health", healthHandler);

// Auth middleware applies to routes below
publicRouter.use(conditionalAuth());

// These routes require auth (if enabled)
publicRouter.get("/platforms", listPlatforms);
```

### Step 3: Create Controller Method

Use the standard controller pattern with `withDatabaseContext()`:

```typescript
methodName = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { platform, environment } = req.params as {
      platform: string;
      environment: string;
    };

    await withDatabaseContext(req, async () => {
      const startTime = Date.now();

      // Database operation
      const result = await this.db.repository.method(platform, environment);
      const duration = Date.now() - startTime;

      // Log operation
      logger.logDatabaseOperation("methodName", "table_name", duration, true);

      // Return response
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    next(error);
  }
};
```

### Step 4: Add Repository Interface Method

Add the method to the repository interface in `packages/database/src/interfaces/`:

```typescript
export interface ConfigRepository {
  // Existing methods...
  newMethod(platform: string, environment: string): Promise<Result>;
}
```

### Step 5: Implement in All Database Adapters

Implement the method in all adapters:

- `packages/database/src/adapters/dynamodb/` - DynamoDB adapter
- `packages/database/src/adapters/prisma/` - SQL databases (PostgreSQL, MySQL, SQLite)
- `packages/database/src/adapters/mongoose/` - MongoDB adapter
- `packages/database/src/adapters/d1/` - Cloudflare D1 adapter

### Step 6: Register Route

```typescript
// In publicRoutes.ts (GET) or internalRoutes.ts (mutations)
router.get(
  "/platforms/:platform/environments/:environment/newEndpoint",
  asyncHandler(controller.newMethod),
);

// With permission check (internal routes)
router.post(
  "/platforms/:platform/environments/:environment/newEndpoint",
  requirePermission("config:write"),
  asyncHandler(controller.newMethod),
);
```

---

## Response Formats

### Success Response

```typescript
{
  success: true,
  data: { /* result object */ },
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Success with Pagination (Offset-Based - SQL/MongoDB)

```typescript
{
  success: true,
  data: [ /* array of items */ ],
  meta: {
    page: 1,
    perPage: 20,
    total: 100,
    totalPages: 5
  },
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Success with Pagination (Token-Based - DynamoDB)

```typescript
{
  success: true,
  data: [ /* array of items */ ],
  meta: {
    nextToken: "eyJrZXkiOiJ2YWx1ZSJ9",
    hasMore: true
  },
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Error Response

```typescript
{
  success: false,
  error: "Error message",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Validation Error (Zod)

```typescript
{
  success: false,
  error: "Validation failed",
  code: "VALIDATION_FAILED",
  details: [
    "parameterKey: Required",
    "valueType: Invalid enum value"
  ],
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Not Found Error

```typescript
{
  success: false,
  error: "Parameter not found",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Limit Exceeded Error

```typescript
{
  success: false,
  error: "Maximum parameters limit reached (1000)",
  code: "LIMIT_EXCEEDED",
  details: ["Environment web/production already has 1000 parameters"],
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

---

## Permission Model

### Role-Based Permissions

| Role        | Permissions                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`     | `*` (all permissions)                                                                                                                     |
| `developer` | `config:read`, `config:write`, `config:update`, `config:delete`, `platform:read`, `environment:read`, `cache:invalidate`, `apikey:manage` |
| `viewer`    | `config:read`, `platform:read`, `environment:read`                                                                                        |

### Permission Reference

| Permission         | Use For                                   |
| ------------------ | ----------------------------------------- |
| `config:read`      | Read configs, flags, experiments          |
| `config:write`     | Create/update configs, flags, experiments |
| `config:delete`    | Delete configs, flags, experiments        |
| `cache:invalidate` | Manual cache purge                        |
| `user:manage`      | User administration (admin only)          |
| `apikey:manage`    | API key management                        |

### Using Permissions in Routes

```typescript
// Require specific permission
internalRouter.post(
  "/platforms",
  requirePermission("config:write"),
  asyncHandler(controller.createPlatform),
);

// Admin-only operations
internalRouter.delete(
  "/platforms/:platform",
  requirePermission("config:delete"),
  asyncHandler(controller.deletePlatform),
);
```

---

## Database Context Pattern

### Why withDatabaseContext()

The `withDatabaseContext()` wrapper:

- Handles database connection lifecycle
- Provides request-scoped configuration for multi-tenancy
- Required for ALL database operations in controllers

### Usage

```typescript
await withDatabaseContext(req, async () => {
  // All database operations go here
  const result = await this.db.config.getConfigs(platform, environment);

  // Response MUST be sent inside this block
  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
});
```

### asyncHandler Wrapper

Catches async errors and passes them to error middleware:

```typescript
import { asyncHandler } from "@togglebox/shared";

router.get("/endpoint", asyncHandler(controller.method));
```

---

## Cache Invalidation

### After Mutations

Always invalidate cache after successful mutations:

```typescript
// Invalidate specific paths
const cachePaths = [
  `/api/v1/platforms/${platform}/environments/${environment}/configs`,
];

try {
  await this.cacheProvider.invalidateCache(cachePaths);
} catch (err) {
  // WARN level - don't fail the request
  logger.warn("Cache invalidation failed - stale data may be served", {
    paths: cachePaths,
    error: err instanceof Error ? err.message : String(err),
  });
}
```

### Cache Path Patterns

```typescript
// Config parameters
`/api/v1/platforms/${platform}/environments/${environment}/configs`
// Feature flags
`/api/v1/platforms/${platform}/environments/${environment}/flags/${flagKey}``/api/v1/platforms/${platform}/environments/${environment}/flags`
// Experiments
`/api/v1/platforms/${platform}/environments/${environment}/experiments/${experimentKey}``/api/v1/platforms/${platform}/environments/${environment}/experiments`;
```

---

## Validation with Zod

### Schema Definition

```typescript
const CreatePlatformSchema = z.object({
  name: z
    .string()
    .min(1, "Platform name is required")
    .max(100, "Platform name must be 100 characters or less")
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      "Platform name can only contain letters, numbers, hyphens, and underscores",
    ),
  description: z
    .string()
    .max(500, "Description must be 500 characters or less")
    .optional(),
});
```

### Validation in Controller

```typescript
try {
  const validatedData = CreatePlatformSchema.parse(req.body);
  // Use validatedData...
} catch (error) {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      success: false,
      error: "Validation failed",
      code: "VALIDATION_FAILED",
      details: error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`,
      ),
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next(error);
}
```

---

## Error Handling

### Custom Error Classes

```typescript
import {
  NotFoundError,
  ValidationError,
  BadRequestError,
} from "@togglebox/shared";

// In controller
if (!result) {
  throw new NotFoundError("Parameter not found");
}

// Or return directly
if (!result) {
  res.status(404).json({
    success: false,
    error: "Parameter not found",
    timestamp: new Date().toISOString(),
  });
  return;
}
```

### Error Handler Helper

```typescript
function handleControllerError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof z.ZodError) {
    res.status(422).json({
      success: false,
      error: "Validation failed",
      details: error.errors.map((e) => e.message),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error instanceof ValidationError || error instanceof BadRequestError) {
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next(error);
}
```

---

## Pagination

### Smart Pagination Utility

Use `getSmartPaginationParams()` to handle both pagination styles:

```typescript
import {
  getSmartPaginationParams,
  createPaginationMeta,
} from "@togglebox/shared";

const { isToken, params, page, perPage } = getSmartPaginationParams(req);

const result = await this.db.config.listActive(platform, environment, params);

// Handle both pagination types
if ("total" in result && result.total !== undefined) {
  // Offset-based (SQL/MongoDB)
  const paginationMeta = createPaginationMeta(page, perPage, result.total);
  res.json({
    success: true,
    data: result.items,
    meta: paginationMeta,
    timestamp: new Date().toISOString(),
  });
} else if (isToken) {
  // Token-based (DynamoDB)
  res.json({
    success: true,
    data: result.items,
    meta: {
      nextToken: result.nextToken,
      hasMore: !!result.nextToken,
    },
    timestamp: new Date().toISOString(),
  });
}
```

### Query Parameters

**Offset-based (SQL):**

- `?page=1&perPage=20`

**Token-based (DynamoDB):**

- `?nextToken=eyJrZXkiOiJ2YWx1ZSJ9&limit=20`
