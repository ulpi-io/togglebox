# Deployment Fixes - ToggleBox API

## Date: February 2, 2026

## Summary
Fixed authentication and DynamoDB schema mismatch issues preventing API endpoints from working after deployment to AWS Lambda.

---

## Issue 1: Request Body Not Parsed in Lambda

### Problem
- User registration and login endpoints returned validation errors
- Request body was empty even though data was sent
- Error: `"Validation failed: name Required, email Required, password Required"`

### Root Cause
`serverless-http` v2 doesn't automatically parse the request body from API Gateway Lambda events. The body exists in `event.body` as a string but isn't passed to Express body parsers.

### Solution
Added manual body parsing in the `request` callback of `serverless-http`:

**File:** `apps/api/src/lambda.ts`

```typescript
const handler = serverless(app, {
  binary: ["image/*", "application/pdf"],
  request(request: any, event: any) {
    // Manually parse body from Lambda event
    if (event.body) {
      try {
        const bodyString = event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString("utf8")
          : event.body;
        
        const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
        if (contentType.includes("application/json")) {
          request.body = JSON.parse(bodyString);
        } else {
          request.body = bodyString;
        }
      } catch (error) {
        logger.error("Failed to parse request body", error);
      }
    }
  },
});
```

### Result
✅ User registration and login now work correctly

---

## Issue 2: Missing Auth Routes in API Gateway

### Problem
- `/api/v1/users/{id}` endpoint returned 403 "Missing Authentication Token"
- Auth package provides routes at `/api/v1/users/*` and `/api/v1/api-keys/*`
- Only `/api/v1/auth/*` was configured in `serverless.yml`

### Root Cause
The `authApi` function only handled `/api/v1/auth/{proxy+}`, but the auth package also registers routes at `/api/v1/users/*` and `/api/v1/api-keys/*`.

### Solution
Added missing route patterns to `authApi` function:

**File:** `apps/api/serverless.yml`

```yaml
authApi:
  handler: dist-bundle/lambda.lambdaHandler
  events:
    - http:
        path: /api/v1/auth/{proxy+}
        method: ANY
        cors: true
    - http:
        path: /api/v1/users/{proxy+}      # Added
        method: ANY
        cors: true
    - http:
        path: /api/v1/api-keys/{proxy+}   # Added
        method: ANY
        cors: true
```

### Result
✅ User profile and API key endpoints now accessible

---

## Issue 3: DynamoDB Schema Mismatch (Critical)

### Problem
All authenticated endpoints failed with:
```
ValidationException: The provided key element does not match the schema
```

JWT verification succeeded, but user lookup in DynamoDB failed.

### Root Cause
**Code Expected:**
```typescript
Key: {
  PK: `USER#${id}`,
  SK: `USER#${id}`,  // Range key
}
```

**Actual Table Schema:**
```yaml
KeySchema:
  - AttributeName: PK
    KeyType: HASH    # Only hash key, no range key!
```

The auth package was designed for single-table design with both hash (PK) and range (SK) keys, but `serverless.yml` created tables with only hash keys.

### Solution
Removed `SK` (sort key) from all DynamoDB operations to match actual table schema:

#### 1. User Service
**File:** `packages/auth/src/adapters/dynamodb/userService.ts`

```typescript
// BEFORE
export async function findUserById(id: string): Promise<User | null> {
  const params = {
    TableName: getUsersTableName(),
    Key: {
      PK: `USER#${id}`,
      SK: `USER#${id}`,  // ❌ Removed
    },
  };
  // ...
}

// AFTER
export async function findUserById(id: string): Promise<User | null> {
  const params = {
    TableName: getUsersTableName(),
    Key: {
      PK: `USER#${id}`,  // ✅ Only hash key
    },
  };
  // ...
}
```

**Changes:**
- `findUserById()` - Removed SK from Key
- `createUser()` - Removed SK, GSI2, GSI3 attributes (not in table schema)
- `deleteUser()` - Removed SK from Key

#### 2. API Key Service
**File:** `packages/auth/src/adapters/dynamodb/apiKeyService.ts`

**Changes:**
- Removed `SK` from all Key objects
- Removed `GSI1SK` and `GSI2SK` from Item objects (GSIs only have hash keys)
- Simplified to match actual table schema

#### 3. Password Reset Service
**File:** `packages/auth/src/adapters/dynamodb/passwordResetService.ts`

**Changes:**
- Removed `SK` from all Key objects
- Removed `GSI1SK`, `GSI2SK`, `GSI3PK`, `GSI3SK` from Item objects
- Kept only `PK`, `GSI1PK`, `GSI2PK` to match table schema

### Result
✅ All authenticated endpoints now work correctly
✅ User lookup succeeds after JWT verification
✅ Database operations complete without schema errors

---

## Issue 4: Silent Authentication Failures

### Problem
Authentication was failing but no error logs were visible, making debugging impossible.

### Root Cause
The auth middleware's `tryJWTAuth()` and `tryAPIKeyAuth()` functions had empty `catch` blocks that silently swallowed all errors:

```typescript
try {
  // ... authentication logic
} catch {
  return false;  // ❌ No logging!
}
```

### Solution
Added comprehensive logging to auth middleware:

**File:** `packages/auth/src/middleware/auth.ts`

```typescript
import { logger } from "@togglebox/shared";

async function tryJWTAuth(req: AuthenticatedRequest): Promise<boolean> {
  // ...
  try {
    const decoded = verifyJWT(token);
    if (!decoded) {
      logger.warn("JWT verification failed - token invalid or expired");
      return false;
    }

    const user = await userService.getUserById(decoded.id);
    if (!user) {
      logger.warn(`User not found in database: ${decoded.id}`);
      return false;
    }
    // ...
    return true;
  } catch (error) {
    logger.error("JWT authentication error", error);  // ✅ Now logs errors
    return false;
  }
}

async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers["x-api-key"];

  logger.info("Auth middleware called", {
    hasAuthHeader: !!authHeader,
    hasApiKeyHeader: !!apiKeyHeader,
    authHeaderFormat: authHeader?.substring(0, 20),
  });

  // Try JWT authentication first
  if (authHeader && authHeader.startsWith("Bearer ")) {
    logger.info("Trying JWT authentication");
    if (await tryJWTAuth(req as AuthenticatedRequest)) {
      logger.info("JWT authentication successful");
      next();
      return;
    }
    logger.warn("JWT authentication failed");
  }
  // ...
}
```

### Result
✅ Authentication errors now visible in CloudWatch Logs
✅ Debugging is much easier with detailed error messages
✅ Can trace authentication flow through logs

---

## Files Modified

### Application Code
1. `apps/api/src/lambda.ts` - Added manual body parsing
2. `apps/api/serverless.yml` - Added missing auth routes

### Auth Package
3. `packages/auth/src/middleware/auth.ts` - Added error logging
4. `packages/auth/src/adapters/dynamodb/userService.ts` - Removed SK from queries
5. `packages/auth/src/adapters/dynamodb/apiKeyService.ts` - Removed SK from queries
6. `packages/auth/src/adapters/dynamodb/passwordResetService.ts` - Removed SK from queries

---

## Testing Results

### Before Fixes
❌ User registration - Failed (body not parsed)
❌ User login - Failed (body not parsed)
❌ Get user profile - Failed (route not found)
❌ List platforms - Failed (authentication error)
❌ Create platform - Failed (authentication error)

### After Fixes
✅ User registration - Working
✅ User login - Working
✅ Get user profile - Working (requires admin role)
✅ List platforms - Working
✅ Get platform - Working
✅ Create platform - Working (requires admin role)

---

## Deployment Commands

```bash
# Rebuild auth package
cd packages/auth
pnpm build

# Rebuild and deploy API
cd apps/api
rm -rf dist dist-bundle
pnpm build
npx serverless@3 deploy --stage dev --region ap-south-1
```

---

## Notes

### Permission Model
- Default users have `viewer` role (read-only)
- Admin operations require `admin` role
- To create admin user:
  ```bash
  # Register user normally, then update role in DynamoDB
  aws dynamodb update-item \
    --table-name togglebox-users-dev \
    --key '{"PK": {"S": "USER#<user-id>"}}' \
    --update-expression "SET #role = :role" \
    --expression-attribute-names '{"#role": "role"}' \
    --expression-attribute-values '{":role": {"S": "admin"}}' \
    --region ap-south-1
  ```

### Alternative Solution (Not Implemented)
Instead of modifying the code, we could have updated `serverless.yml` to add range keys to all tables:

```yaml
UsersTable:
  Type: AWS::DynamoDB::Table
  Properties:
    AttributeDefinitions:
      - AttributeName: PK
        AttributeType: S
      - AttributeName: SK        # Add this
        AttributeType: S
    KeySchema:
      - AttributeName: PK
        KeyType: HASH
      - AttributeName: SK        # Add this
        KeyType: RANGE
```

**Why we didn't:** Would require recreating all tables and migrating existing data. Simpler to adjust code to match existing infrastructure.

---

## Lessons Learned

1. **Always verify infrastructure matches code expectations** - The auth package assumed single-table design, but tables were created without range keys

2. **Test serverless-http body parsing** - Different versions handle body parsing differently; always test with actual Lambda events

3. **Add comprehensive logging early** - Silent failures in catch blocks make debugging nearly impossible

4. **Document API Gateway route patterns** - Easy to miss proxy routes when packages register multiple path prefixes

5. **Use schema validation tools** - Could have caught the PK/SK mismatch earlier with DynamoDB schema validation

---

## API Endpoints

### Base URL
```
https://8g854101bk.execute-api.ap-south-1.amazonaws.com/dev
```

### Public Endpoints (No Auth Required)
- `GET /health` - Health check
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login

### Authenticated Endpoints (Require Bearer Token)
- `GET /api/v1/users/{id}` - Get user profile
- `GET /api/v1/platforms` - List platforms
- `GET /api/v1/platforms/{platform}` - Get platform details

### Admin Endpoints (Require Admin Role)
- `POST /api/v1/internal/platforms` - Create platform
- `POST /api/v1/internal/platforms/{platform}/environments` - Create environment
- All other write operations

---

## Contact
For questions about these fixes, contact the development team.
