# Conventions

## Git Workflow

- **Main branch:** `main`
- **Feature branches:** Create from `main`, merge back via PR
- **CI runs on:** Push to `main`/`develop`, all PRs

## CI Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs:

| Job              | Description                                 |
| ---------------- | ------------------------------------------- |
| `lint`           | ESLint across all packages                  |
| `typecheck`      | TypeScript build (includes Prisma generate) |
| `test`           | Jest tests (currently optional)             |
| `security-audit` | `pnpm audit --audit-level moderate`         |
| `format-check`   | Prettier check                              |

All jobs must pass before merging.

## Deployment Workflows

| Workflow                        | Trigger                                     | Target             |
| ------------------------------- | ------------------------------------------- | ------------------ |
| `deploy-aws-lambda.yml`         | Manual or push to `main` (apps/api changes) | AWS Lambda         |
| `deploy-cloudflare-workers.yml` | Manual or push to `main` (apps/api changes) | Cloudflare Workers |

Both support `staging` and `production` environments.

## Code Style

### TypeScript

- ES6+ features (async/await, destructuring)
- 2-space indentation
- Semicolons required
- `const` by default, `let` when needed, never `var`
- Strict mode enabled

### Naming Conventions

| Type                | Convention       | Example                 |
| ------------------- | ---------------- | ----------------------- |
| Files               | kebab-case       | `user-service.ts`       |
| Classes             | PascalCase       | `UserService`           |
| Functions/Variables | camelCase        | `getUserById`           |
| Constants           | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`    |
| Routes              | kebab-case       | `/api/v1/user-profiles` |

### Package Names

| Type          | Pattern                     | Example                 |
| ------------- | --------------------------- | ----------------------- |
| Core packages | `@togglebox/<name>`         | `@togglebox/core`       |
| JS SDKs       | `@togglebox/sdk-<platform>` | `@togglebox/sdk-nextjs` |
| PHP SDKs      | `togglebox/sdk-<name>`      | `togglebox/sdk-laravel` |

## Validation

Use **Zod** for runtime validation:

```typescript
import { z } from "zod";

const schema = z.object({
  platformName: z.string().min(1).max(100),
  config: z.record(z.unknown()),
});

type Input = z.infer<typeof schema>;
```

## Logging

Use **Pino** for structured logging:

```typescript
logger.info({ userId, action: "created" }, "User created");
logger.error({ err, userId }, "Failed to create user");
```

## Error Handling

Use custom error classes with HTTP status codes:

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}
```

## Testing

- **Framework:** Jest with ts-jest
- **API testing:** Supertest for integration tests
- **Coverage:** Target 80% (not currently enforced)

## Environment Variables

- Never commit `.env` files
- Use `.env.example` as template
- Secrets must be 32+ characters
- Generate with: `openssl rand -base64 32`

## API Response Standards

All API responses follow a consistent format:

### Success Response

```typescript
{
  success: true,
  data: { /* result */ },
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### Error Response

```typescript
{
  success: false,
  error: "Error message",
  code: "ERROR_CODE",  // Optional: VALIDATION_FAILED, LIMIT_EXCEEDED, etc.
  details: [...],      // Optional: array of error details
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

### HTTP Status Codes

| Status | Use                       |
| ------ | ------------------------- |
| 200    | Success (GET, PUT, PATCH) |
| 201    | Created (POST)            |
| 204    | No Content (DELETE)       |
| 400    | Bad Request               |
| 401    | Unauthorized              |
| 403    | Forbidden                 |
| 404    | Not Found                 |
| 422    | Validation Error          |
| 500    | Internal Server Error     |

## Controller Method Template

Standard pattern for all controller methods:

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

    // Optional: Get authenticated user
    const user = (req as AuthenticatedRequest).user;
    const createdBy = user?.email || "system@togglebox.dev";

    // Optional: Validate body with Zod
    const bodyData = Schema.parse(req.body);

    await withDatabaseContext(req, async () => {
      const startTime = Date.now();

      // Database operation
      const result = await this.db.repository.method(platform, environment);
      const duration = Date.now() - startTime;

      // Log operation
      logger.logDatabaseOperation("methodName", "table_name", duration, true);

      // Optional: Invalidate cache after mutations
      await this.cacheProvider.invalidateCache([cachePath]);

      // Return response
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    // Handle Zod validation errors
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
};
```

## Import Conventions

### From @togglebox/shared

```typescript
import {
  logger,
  withDatabaseContext,
  getSmartPaginationParams,
  createPaginationMeta,
  asyncHandler,
  requireAuth,
  conditionalAuth,
  requirePermission,
  AuthenticatedRequest,
  NotFoundError,
  ValidationError,
  BadRequestError,
} from "@togglebox/shared";
```

### From @togglebox/database

```typescript
import {
  DatabaseRepositories,
  ThreeTierRepositories,
} from "@togglebox/database";
```

### From @togglebox/cache

```typescript
import { CacheProvider } from "@togglebox/cache";
```
