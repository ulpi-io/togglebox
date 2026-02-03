# ToggleBox API Deployment Guide

Complete guide for deploying the ToggleBox API to Cloudflare Workers or AWS Lambda.
---
## Quick Start

| Platform           | Database    | Command             |
| ------------------ | ----------- | ------------------- |
| Cloudflare Workers | D1 (SQLite) | `wrangler deploy`   |
| AWS Lambda         | DynamoDB    | `serverless deploy` |

---

## Cloudflare Workers + D1 Deployment

### Prerequisites

1. **Cloudflare Account** with Workers enabled
2. **Wrangler CLI** installed:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

### Step 1: Create D1 Database

```bash
cd apps/api

# Create the D1 database
wrangler d1 create remote-config-db

# Output will show:
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` from the output.

### Step 2: Update wrangler.toml

Edit `wrangler.toml` and add your database_id:

```toml
[[d1_databases]]
binding = "DB"
database_name = "remote-config-db"
database_id = "YOUR_DATABASE_ID_HERE"  # <-- Paste here
```

For environment-specific databases, update each environment section:

- `[[env.dev.d1_databases]]` - Development
- `[[env.staging.d1_databases]]` - Staging
- `[[env.production.d1_databases]]` - Production

### Step 3: Initialize Database Schema

```bash
# Apply schema to your D1 database
wrangler d1 execute remote-config-db --file=../../packages/database/d1/schema.sql

# Verify tables were created
wrangler d1 execute remote-config-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Expected tables:

- platforms, environments, config_versions
- feature_flags, flags, experiments
- config_stats, flag_stats, flag_stats_daily, flag_stats_by_country
- experiment_variation_stats, experiment_stats_daily, experiment_metric_stats, experiment_metric_stats_daily
- usage

### Step 4: Set Secrets

```bash
# Set JWT secret for authentication
wrangler secret put JWT_SECRET
# Enter a secure 32+ character string when prompted

# Set API key secret
wrangler secret put API_KEY_SECRET
# Enter a secure 32+ character string when prompted
```

### Step 5: Build and Deploy

```bash
# Build the worker
pnpm build

# Deploy to production
wrangler deploy

# Or deploy to specific environment
wrangler deploy --env dev
wrangler deploy --env staging
wrangler deploy --env production
```

### Step 6: Verify Deployment

```bash
# Check health endpoint
curl https://togglebox.<your-account>.workers.dev/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-25T..."}
```

### Cloudflare Deployment Commands Reference

```bash
# Local development
wrangler dev                          # Start local dev server
wrangler dev --remote                 # Test against live D1

# Deployment
wrangler deploy                       # Deploy to production
wrangler deploy --env dev             # Deploy to dev environment

# Database management
wrangler d1 list                      # List all D1 databases
wrangler d1 info remote-config-db     # Show database info
wrangler d1 execute remote-config-db --command="SELECT * FROM platforms"

# Secrets
wrangler secret list                  # List all secrets
wrangler secret delete JWT_SECRET     # Delete a secret

# Logs
wrangler tail                         # Stream real-time logs
wrangler tail --env production        # Stream production logs
```

---

## AWS Lambda + DynamoDB Deployment

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured:
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and Region
   ```
3. **Serverless Framework** installed:
   ```bash
   npm install -g serverless
   ```

### Step 1: Set Up SSM Parameters (Recommended)

Store secrets in AWS Systems Manager Parameter Store:

```bash
# Store JWT secret
aws ssm put-parameter \
  --name "/togglebox/dev/jwt-secret" \
  --type "SecureString" \
  --value "your-secure-jwt-secret-32-chars-minimum"

aws ssm put-parameter \
  --name "/togglebox/production/jwt-secret" \
  --type "SecureString" \
  --value "your-production-jwt-secret-here"

# Store API key secret
aws ssm put-parameter \
  --name "/togglebox/dev/api-key-secret" \
  --type "SecureString" \
  --value "your-secure-api-key-secret-32-chars"

aws ssm put-parameter \
  --name "/togglebox/production/api-key-secret" \
  --type "SecureString" \
  --value "your-production-api-key-secret-here"
```

Alternatively, pass secrets via environment variables during deployment.

### Step 2: Build the Application

```bash
cd apps/api
pnpm build
```

### Step 3: Deploy

```bash
# Deploy to development
serverless deploy --stage dev --region us-east-1

# Deploy to production
serverless deploy --stage production --region us-east-1

# Deploy with environment variables (alternative to SSM)
JWT_SECRET="your-secret" API_KEY_SECRET="your-key" serverless deploy --stage dev
```

### Step 4: Verify Tables Created

```bash
# List all DynamoDB tables
aws dynamodb list-tables --region us-east-1

# Expected tables (with stage suffix):
# togglebox-users-dev
# togglebox-api-keys-dev
# togglebox-password-resets-dev
# togglebox-platforms-dev
# togglebox-environments-dev
# togglebox-configs-dev
# togglebox-remote-configs-dev
# togglebox-flags-dev
# togglebox-experiments-dev
# togglebox-stats-dev
# togglebox-usage-dev
```

### Step 5: Get API Endpoint

After deployment, Serverless will output the API endpoint:

```
Service Information
service: togglebox-config-service
stage: dev
region: us-east-1
endpoints:
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/health
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/api/v1/platforms
  ...
```

### Step 6: Verify Deployment

```bash
# Check health endpoint
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-25T..."}
```

### AWS Deployment Commands Reference

```bash
# Deployment
serverless deploy --stage dev          # Deploy to dev
serverless deploy --stage production   # Deploy to production
serverless deploy function -f publicApi --stage dev  # Deploy single function

# Logs
serverless logs -f publicApi --tail    # Tail function logs
serverless logs -f internalApi --tail

# Info
serverless info --stage dev            # Show deployment info

# Remove
serverless remove --stage dev          # Remove entire stack (CAUTION!)

# Local testing
serverless offline                     # Start local server
```

---

## Environment Variables Reference

### Required for Both Platforms

| Variable         | Description                        | Example                                  |
| ---------------- | ---------------------------------- | ---------------------------------------- |
| `JWT_SECRET`     | Secret for JWT signing (32+ chars) | `your-super-secret-jwt-key-here-32chars` |
| `API_KEY_SECRET` | Secret for API key hashing         | `your-api-key-secret-32-chars-minimum`   |

### Optional Configuration

| Variable                     | Description            | Default       |
| ---------------------------- | ---------------------- | ------------- |
| `NODE_ENV`                   | Environment mode       | `development` |
| `LOG_LEVEL`                  | Logging verbosity      | `info`        |
| `CORS_ORIGIN`                | Allowed CORS origins   | `*`           |
| `ENABLE_AUTHENTICATION`      | Enable auth middleware | `true`        |
| `CLOUDFRONT_DISTRIBUTION_ID` | For cache invalidation | (empty)       |

### DynamoDB Table Names (AWS Only)

Set via serverless.yml. Override if using external tables:

| Variable                   | Default                       |
| -------------------------- | ----------------------------- |
| `DYNAMODB_USERS_TABLE`     | `togglebox-users-{stage}`     |
| `DYNAMODB_API_KEYS_TABLE`  | `togglebox-api-keys-{stage}`  |
| `DYNAMODB_PLATFORMS_TABLE` | `togglebox-platforms-{stage}` |
| `DYNAMODB_FLAGS_TABLE`     | `togglebox-flags-{stage}`     |
| ...                        | ...                           |

---

## Verification Checklist

### Cloudflare Workers

- [ ] D1 database created (`wrangler d1 list`)
- [ ] database_id added to wrangler.toml
- [ ] Schema initialized (tables exist)
- [ ] Secrets configured (`wrangler secret list`)
- [ ] Health endpoint responds: `GET /health`
- [ ] Create platform works: `POST /api/v1/internal/platforms`
- [ ] Get flags works: `GET /api/v1/platforms/{p}/environments/{e}/flags`

### AWS Lambda

- [ ] SSM parameters created (or env vars set)
- [ ] All 11 DynamoDB tables exist
- [ ] IAM permissions cover all tables
- [ ] Health endpoint responds: `GET /health`
- [ ] Create platform works: `POST /api/v1/internal/platforms`
- [ ] CloudWatch logs show successful invocations

---

## Troubleshooting

### Cloudflare Workers

**Error: "D1 database not found"**

- Ensure `database_id` is set correctly in wrangler.toml
- Verify database exists: `wrangler d1 list`

**Error: "Secrets not set"**

- Run `wrangler secret list` to verify secrets
- Re-add missing secrets with `wrangler secret put <NAME>`

### AWS Lambda

**Error: "ResourceNotFoundException" for DynamoDB**

- Verify tables exist: `aws dynamodb list-tables`
- Check table names match environment variables
- Ensure IAM role has permissions to all tables

**Error: "Invalid JWT secret"**

- Verify SSM parameter exists: `aws ssm get-parameter --name "/togglebox/dev/jwt-secret"`
- Check SSM parameter name matches serverless.yml

**Error: "Access Denied" on DynamoDB operations**

- Review IAM role permissions in serverless.yml
- Verify table ARNs in IAM policy include `/index/*` for GSI access

---

## Production Recommendations

### Security

1. **Never commit secrets** to version control
2. Use **SSM Parameter Store** or **Secrets Manager** for AWS
3. Use **Wrangler secrets** for Cloudflare
4. Enable **CORS restrictions** in production
5. Consider **API Gateway Resource Policy** for AWS internal endpoints

### Performance

1. Enable **CloudFront** for AWS deployments (cache at edge)
2. D1 is already edge-deployed for Cloudflare
3. Use **PAY_PER_REQUEST** billing for unpredictable traffic
4. Monitor DynamoDB capacity with CloudWatch

### Monitoring

1. **AWS**: CloudWatch Logs + X-Ray for tracing
2. **Cloudflare**: Workers Analytics + Tail for logs
3. Set up alerts for error rates > 1%
4. Monitor response latency (target < 500ms)

---

## Related Documentation

- [ToggleBox README](../../README.md)
- [API Documentation](../../README.md#api-endpoints)
- [SDK Documentation](../../packages/sdk-js/README.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
