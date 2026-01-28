#!/bin/sh

# ============================================================================
# DynamoDB Local Table Initialization
# ============================================================================
# Creates 10 separate tables for ToggleBox (Three-Tier Architecture):
#   1. togglebox-users - User accounts
#   2. togglebox-api-keys - API key management
#   3. togglebox-password-resets - Password reset tokens
#   4. togglebox-platforms - Platform metadata
#   5. togglebox-environments - Environment metadata
#   6. togglebox-configs - Legacy configuration versions
#   7. togglebox-remote-configs - Tier 1: Remote configurations
#   8. togglebox-flags - Tier 2: Feature flags (2-value A/B)
#   9. togglebox-experiments - Tier 3: Experiments (multi-variant)
#  10. togglebox-stats - Usage statistics and analytics
# ============================================================================

set -e

ENDPOINT="${DYNAMODB_ENDPOINT:-http://dynamodb-local:8000}"
REGION="${AWS_REGION:-us-east-1}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ToggleBox DynamoDB Table Initialization (10 Tables)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ============================================================================
# 1. USERS TABLE
# ============================================================================
# GSI1: Email lookup (GSI1PK=USER_EMAIL#<email>)
# GSI2: List all users (GSI2PK=USER#ALL, GSI2SK=USER#<id>)
# GSI3: Query by role (GSI3PK=USER_ROLE#<role>, GSI3SK=USER#<id>)
# ============================================================================
TABLE_NAME="togglebox-users"
echo ""
echo "[1/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
            AttributeName=GSI2PK,AttributeType=S \
            AttributeName=GSI2SK,AttributeType=S \
            AttributeName=GSI3PK,AttributeType=S \
            AttributeName=GSI3SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
            "IndexName=GSI2,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH},{AttributeName=GSI2SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
            "IndexName=GSI3,KeySchema=[{AttributeName=GSI3PK,KeyType=HASH},{AttributeName=GSI3SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# 2. API KEYS TABLE
# ============================================================================
TABLE_NAME="togglebox-api-keys"
echo ""
echo "[2/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
            AttributeName=GSI2PK,AttributeType=S \
            AttributeName=GSI2SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
            "IndexName=GSI2,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH},{AttributeName=GSI2SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# 3. PASSWORD RESETS TABLE
# ============================================================================
# GSI1: Token lookup (GSI1PK=RESET_TOKEN#<token>)
# GSI2: User lookup (GSI2PK=USER#<userId>)
# GSI3: Expired token cleanup (GSI3PK=RESET#ALL, GSI3SK=<expiresAt>)
# TTL: Automatic cleanup of expired tokens via DynamoDB TTL
# ============================================================================
TABLE_NAME="togglebox-password-resets"
echo ""
echo "[3/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
            AttributeName=GSI2PK,AttributeType=S \
            AttributeName=GSI2SK,AttributeType=S \
            AttributeName=GSI3PK,AttributeType=S \
            AttributeName=GSI3SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
            "IndexName=GSI2,KeySchema=[{AttributeName=GSI2PK,KeyType=HASH},{AttributeName=GSI2SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
            "IndexName=GSI3,KeySchema=[{AttributeName=GSI3PK,KeyType=HASH},{AttributeName=GSI3SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"

    # Enable TTL for automatic cleanup of expired tokens
    echo "  Enabling TTL on 'ttl' attribute..."
    sleep 1
    aws dynamodb update-time-to-live \
        --table-name "${TABLE_NAME}" \
        --time-to-live-specification "Enabled=true,AttributeName=ttl" \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null 2>&1 || echo "  (TTL may not be supported in DynamoDB Local)"
fi

# ============================================================================
# 4. PLATFORMS TABLE
# ============================================================================
# GSI1: List all platforms (GSI1PK=PLATFORM, GSI1SK=PLATFORM#<name>)
# ============================================================================
TABLE_NAME="togglebox-platforms"
echo ""
echo "[4/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# 5. ENVIRONMENTS TABLE
# ============================================================================
TABLE_NAME="togglebox-environments"
echo ""
echo "[5/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# 6. CONFIGS TABLE
# ============================================================================
TABLE_NAME="togglebox-configs"
echo ""
echo "[6/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# 7. REMOTE CONFIGS TABLE (Tier 1: Remote Configurations)
# ============================================================================
TABLE_NAME="togglebox-remote-configs"
echo ""
echo "[7/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# 8. FLAGS TABLE (Tier 2: Feature Flags - 2-value A/B model)
# ============================================================================
TABLE_NAME="togglebox-flags"
echo ""
echo "[8/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# 9. EXPERIMENTS TABLE (Tier 3: A/B Experiments - multi-variant)
# ============================================================================
TABLE_NAME="togglebox-experiments"
echo ""
echo "[9/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# 10. STATS TABLE (Usage statistics and analytics)
# ============================================================================
TABLE_NAME="togglebox-stats"
echo ""
echo "[10/10] Creating '${TABLE_NAME}' table..."

if aws dynamodb describe-table \
    --table-name "${TABLE_NAME}" \
    --endpoint-url "${ENDPOINT}" \
    --region "${REGION}" \
    --no-cli-pager > /dev/null 2>&1; then
    echo "  Table already exists, skipping..."
else
    aws dynamodb create-table \
        --table-name "${TABLE_NAME}" \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --global-secondary-indexes \
            "IndexName=GSI1,KeySchema=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL}" \
        --billing-mode PAY_PER_REQUEST \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null
    echo "  Table created successfully!"
fi

# ============================================================================
# VERIFY ALL TABLES
# ============================================================================
echo ""
echo "Verifying tables..."
sleep 2

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Table Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TABLES="togglebox-users togglebox-api-keys togglebox-password-resets togglebox-platforms togglebox-environments togglebox-configs togglebox-remote-configs togglebox-flags togglebox-experiments togglebox-stats"
ALL_ACTIVE=true

for TABLE in ${TABLES}; do
    STATUS=$(aws dynamodb describe-table \
        --table-name "${TABLE}" \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --query "Table.TableStatus" \
        --output text \
        --no-cli-pager 2>/dev/null || echo "NOT_FOUND")
    echo "  ${TABLE}: ${STATUS}"
    if [ "${STATUS}" != "ACTIVE" ]; then
        ALL_ACTIVE=false
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "${ALL_ACTIVE}" = true ]; then
    echo ""
    echo "DynamoDB initialization complete! All 10 tables are ACTIVE."
    exit 0
else
    echo ""
    echo "Warning: Some tables may not be active yet."
    exit 0
fi
