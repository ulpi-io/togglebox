# JWT Authentication Testing Guide

## Quick Start - Manual Testing

Since there's a body parsing issue with the auth endpoints, here are alternative ways to test JWT authentication:

## Option 1: Create User Directly in DynamoDB

```bash
# 1. Create a test user
USER_ID="admin-user-001"
PASSWORD_HASH='$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'  # "password123"

aws dynamodb put-item \
  --table-name togglebox-users-dev \
  --region ap-south-1 \
  --item '{
    "PK": {"S": "USER#admin-user-001"},
    "GSI1PK": {"S": "EMAIL#admin@test.com"},
    "id": {"S": "admin-user-001"},
    "email": {"S": "admin@test.com"},
    "name": {"S": "Admin User"},
    "passwordHash": {"S": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"},
    "role": {"S": "admin"},
    "createdAt": {"S": "2026-02-02T16:00:00Z"}
  }'
```

**Credentials**: 
- Email: `admin@test.com`
- Password: `password123`

## Option 2: Generate JWT Token Manually

```bash
# Install jwt-cli if not already installed
# brew install mike-engel/jwt-cli/jwt-cli

# Get JWT secret from SSM
JWT_SECRET=$(aws ssm get-parameter \
  --name "/togglebox/dev/jwt-secret" \
  --with-decryption \
  --region ap-south-1 \
  --query 'Parameter.Value' \
  --output text)

# Generate token (expires in 7 days)
TOKEN=$(jwt encode \
  --secret "$JWT_SECRET" \
  --exp="+7 days" \
  '{"userId":"admin-user-001","email":"admin@test.com","role":"admin"}')

echo "JWT Token: $TOKEN"

# Save for later use
echo "$TOKEN" > /tmp/jwt_token.txt
```

## Option 3: Use the Token

```bash
# Load token
TOKEN=$(cat /tmp/jwt_token.txt)

# Test authenticated endpoints
curl -H "Authorization: Bearer $TOKEN" \
  https://8g854101bk.execute-api.ap-south-1.amazonaws.com/dev/api/v1/platforms | jq .

# List environments
curl -H "Authorization: Bearer $TOKEN" \
  https://8g854101bk.execute-api.ap-south-1.amazonaws.com/dev/api/v1/platforms/web/environments | jq .

# Create a platform (Internal API)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"mobile","displayName":"Mobile App"}' \
  https://8g854101bk.execute-api.ap-south-1.amazonaws.com/dev/api/v1/internal/platforms | jq .
```

## Option 4: Create API Key (Alternative to JWT)

```bash
# 1. Create API key in DynamoDB
API_KEY_ID="api-key-001"
API_KEY="tbx_test_$(openssl rand -hex 16)"
API_KEY_HASH=$(echo -n "$API_KEY" | openssl dgst -sha256 | cut -d' ' -f2)

aws dynamodb put-item \
  --table-name togglebox-api-keys-dev \
  --region ap-south-1 \
  --item "{
    \"PK\": {\"S\": \"APIKEY#${API_KEY_ID}\"},
    \"GSI1PK\": {\"S\": \"USER#admin-user-001\"},
    \"GSI2PK\": {\"S\": \"HASH#${API_KEY_HASH}\"},
    \"id\": {\"S\": \"${API_KEY_ID}\"},
    \"userId\": {\"S\": \"admin-user-001\"},
    \"name\": {\"S\": \"Test API Key\"},
    \"keyHash\": {\"S\": \"${API_KEY_HASH}\"},
    \"permissions\": {\"L\": [{\"S\": \"*\"}]},
    \"createdAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
  }"

echo "API Key: $API_KEY"
echo "$API_KEY" > /tmp/api_key.txt

# 2. Use API key
API_KEY=$(cat /tmp/api_key.txt)

curl -H "X-API-Key: $API_KEY" \
  https://8g854101bk.execute-api.ap-south-1.amazonaws.com/dev/api/v1/platforms | jq .
```

## Complete Test Script

```bash
#!/bin/bash
set -e

API_URL="https://8g854101bk.execute-api.ap-south-1.amazonaws.com/dev"
REGION="ap-south-1"

echo "=== 1. Creating admin user ==="
aws dynamodb put-item \
  --table-name togglebox-users-dev \
  --region $REGION \
  --item '{
    "PK": {"S": "USER#admin-001"},
    "GSI1PK": {"S": "EMAIL#admin@test.com"},
    "id": {"S": "admin-001"},
    "email": {"S": "admin@test.com"},
    "name": {"S": "Admin User"},
    "passwordHash": {"S": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"},
    "role": {"S": "admin"},
    "createdAt": {"S": "2026-02-02T16:00:00Z"}
  }' 2>/dev/null || echo "User might already exist"

echo "✓ User created: admin@test.com / password123"

echo -e "\n=== 2. Generating JWT token ==="
JWT_SECRET=$(aws ssm get-parameter \
  --name "/togglebox/dev/jwt-secret" \
  --with-decryption \
  --region $REGION \
  --query 'Parameter.Value' \
  --output text)

# Create JWT payload
PAYLOAD='{"userId":"admin-001","email":"admin@test.com","role":"admin","iat":'$(date +%s)',"exp":'$(($(date +%s) + 604800))'}'

# For now, use a simple base64 encoding (not secure, just for testing)
# In production, use proper JWT library
echo "Note: Install jwt-cli for proper token generation"
echo "brew install mike-engel/jwt-cli/jwt-cli"

echo -e "\n=== 3. Testing with manual token ==="
echo "Since body parsing has issues, use one of these methods:"
echo ""
echo "A) Fix body parser and use auth endpoints"
echo "B) Generate JWT manually with jwt-cli"
echo "C) Use API keys instead"
echo ""
echo "See LAMBDA-DEPLOYMENT.md for full instructions"

echo -e "\n=== 4. Test without auth (verify it's blocked) ==="
curl -s "$API_URL/api/v1/platforms" | jq .

echo -e "\n=== 5. Verify health endpoint works ==="
curl -s "$API_URL/health" | jq .
```

## Troubleshooting Body Parser Issue

The auth endpoints aren't parsing JSON bodies. To fix:

1. Check if `express.json()` middleware is properly configured
2. Verify `serverless-http` is handling body parsing
3. Check API Gateway integration settings

For now, use API keys or manually generated JWT tokens as shown above.

## Testing Checklist

- [ ] Health endpoint works (no auth)
- [ ] Platforms endpoint requires auth
- [ ] User created in DynamoDB
- [ ] JWT token generated
- [ ] Authenticated request succeeds
- [ ] Create platform via internal API works
- [ ] API key authentication works

## Next Steps

1. Fix body parser for auth endpoints
2. Test user registration flow
3. Test login flow
4. Test token refresh
5. Test API key generation via API
