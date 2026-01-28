# @config/auth

Optional authentication module for Togglebox - provides user registration, login, password reset, and API key management.

## Features

- ✅ User registration with email/password
- ✅ Login with JWT token generation
- ✅ Password reset via email
- ✅ API key generation for programmatic access
- ✅ Multi-database support (DynamoDB, MySQL, PostgreSQL, MongoDB, SQLite, D1)
- ✅ Role-based access control (admin, developer, viewer)
- ✅ Optional installation - only add if you need authentication

## Installation

```bash
pnpm add @config/auth
```

## Quick Start

### 1. Enable in your API

```typescript
// apps/api/src/app.ts
import { createAuthRouter } from "@config/auth";

const authRouter = createAuthRouter();
app.use("/api/v1", authRouter);
```

### 2. Configure Environment Variables

```bash
# Enable authentication
AUTH_MODULE_ENABLED=true
ENABLE_AUTHENTICATION=true

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
FROM_EMAIL=noreply@togglebox.com

# Database (use existing DB_TYPE)
DB_TYPE=dynamodb  # or mysql, postgresql, mongodb, sqlite, d1
```

### 3. Initialize Database Schema

#### DynamoDB

Uses the same table as your config data. No additional setup needed.

#### MySQL/PostgreSQL/SQLite

```bash
cd packages/auth
npx prisma migrate deploy
```

#### MongoDB

No migrations needed - schemas created automatically.

## API Endpoints

### Authentication

```
POST   /api/v1/auth/register        # Register new user
POST   /api/v1/auth/login           # Login and get JWT
POST   /api/v1/auth/refresh         # Refresh JWT token
```

### Password Reset

```
POST   /api/v1/auth/password-reset/request    # Request reset email
POST   /api/v1/auth/password-reset/verify     # Verify reset token
POST   /api/v1/auth/password-reset/complete   # Complete password reset
```

### User Profile

```
GET    /api/v1/users/me             # Get current user
PATCH  /api/v1/users/me             # Update profile
POST   /api/v1/users/me/password    # Change password
```

### API Keys

```
GET    /api/v1/api-keys             # List user's API keys
POST   /api/v1/api-keys             # Create new API key
DELETE /api/v1/api-keys/:id         # Revoke API key
```

## Usage Examples

### Register a New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "role": "developer"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123",
      "email": "user@example.com",
      "role": "developer"
    }
  }
}
```

### Create API Key

```bash
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App API Key",
    "permissions": ["config:read", "config:write"]
  }'
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "key_123",
    "key": "tbx_live_1234567890abcdef",
    "name": "My App API Key",
    "permissions": ["config:read", "config:write"]
  }
}
```

**⚠️ Important:** The API key is only shown once. Store it securely!

### Use API Key

```bash
curl -X GET http://localhost:3000/api/v1/internal/platforms \
  -H "X-API-Key: tbx_live_1234567890abcdef"
```

## Database Support

The auth module supports the same databases as Togglebox:

| Database   | Adapter    | Status         | Notes                                             |
| ---------- | ---------- | -------------- | ------------------------------------------------- |
| DynamoDB   | AWS SDK    | ✅ Ready       | Uses same table, PK/SK pattern                    |
| MySQL      | Prisma     | ✅ Ready       | Requires migrations (`npx prisma migrate deploy`) |
| PostgreSQL | Prisma     | ✅ Ready       | Requires migrations (`npx prisma migrate deploy`) |
| SQLite     | Prisma     | ✅ Ready       | Requires migrations (`npx prisma migrate deploy`) |
| MongoDB    | Mongoose   | ✅ Ready       | Auto-connect, no migrations needed                |
| D1         | Cloudflare | 🚧 Coming Soon | Will use Prisma with D1 connector                 |

### Database Setup

#### DynamoDB

No additional setup needed - uses the same table as config data with different PK/SK patterns.

#### Prisma (MySQL/PostgreSQL/SQLite)

```bash
cd packages/auth
npx prisma generate
npx prisma migrate deploy
```

#### MongoDB

Set `MONGODB_URI` environment variable:

```bash
MONGODB_URI=mongodb://localhost:27017/togglebox-auth
```

#### D1 (Cloudflare)

Coming soon - will support Prisma's D1 connector.

## Security Features

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens with configurable expiry
- ✅ API keys hashed before storage
- ✅ Password reset tokens expire after 1 hour
- ✅ Role-based permissions
- ✅ Rate limiting ready (apply via middleware)

## Roles & Permissions

| Role        | Permissions                                                        |
| ----------- | ------------------------------------------------------------------ |
| `admin`     | All permissions                                                    |
| `developer` | `config:read`, `config:write`, `config:update`, `cache:invalidate` |
| `viewer`    | `config:read` only                                                 |

## Development

```bash
# Build the package
cd packages/auth
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test
```

## License

**Elastic License 2.0** - You can use, modify, and distribute this software for any purpose **except** providing it as a hosted/managed service to third parties.

See the main [LICENSE](../../LICENSE) file for full details.

## Contributing

⚠️ **Note:** This project is not yet initialized as a git repository.

Contributions guidelines will be added once the project is set up with version control.
