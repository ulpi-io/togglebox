#!/bin/bash

# Script to create SSM parameters for ToggleBox API
# Usage: ./setup-ssm-params.sh <stage> <region>
# Example: ./setup-ssm-params.sh dev ap-south-1

STAGE="${1:-dev}"
REGION="${2:-ap-south-1}"

echo "============================================================"
echo "Creating SSM parameters for ToggleBox API"
echo "Stage: $STAGE"
echo "Region: $REGION"
echo "============================================================"
echo ""

# Custom Domain Configuration
echo "📌 Custom Domain Configuration"
aws ssm put-parameter \
  --name "/mumzworld-togglebox-api-${STAGE}/custom-domain/domain-name" \
  --type "String" \
  --value "togglebox-api.mumzstage.com" \
  --region $REGION \
  --overwrite \
  --description "Custom domain name for ToggleBox API ${STAGE}"

aws ssm put-parameter \
  --name "/mumzworld-togglebox-api-${STAGE}/custom-domain/certificate-arn" \
  --type "String" \
  --value "arn:aws:acm:ap-south-1:530370668341:certificate/994f56dc-5d86-421e-ad8b-cf397f736d2b" \
  --region $REGION \
  --overwrite \
  --description "ACM certificate ARN for ToggleBox API ${STAGE}"

echo "   ✓ Custom domain parameters created"
echo ""

# DynamoDB Configuration
echo "📌 DynamoDB Configuration"
aws ssm put-parameter \
  --name "/mumzworld-togglebox-api-${STAGE}/dynamodb/table-prefix" \
  --type "String" \
  --value "togglebox" \
  --region $REGION \
  --overwrite \
  --description "DynamoDB table prefix for ${STAGE}"

echo "   ✓ DynamoDB parameters created"
echo ""

# Cache Configuration
echo "📌 Cache Configuration"
aws ssm put-parameter \
  --name "/mumzworld-togglebox-api-${STAGE}/cache/enabled" \
  --type "String" \
  --value "false" \
  --region $REGION \
  --overwrite \
  --description "Enable/disable cache for ${STAGE}"

aws ssm put-parameter \
  --name "/mumzworld-togglebox-api-${STAGE}/cache/provider" \
  --type "String" \
  --value "cloudfront" \
  --region $REGION \
  --overwrite \
  --description "Cache provider (cloudfront/cloudflare/none) for ${STAGE}"

# Note: CloudFront distribution ID should be set manually after creating distribution
echo "   ✓ Cache parameters created"
echo "   ⚠ Note: Set CloudFront distribution ID manually:"
echo "     aws ssm put-parameter --name \"/mumzworld-togglebox-api-${STAGE}/cache/cloudfront-distribution-id\" --type \"String\" --value \"E123ABC...\" --region $REGION --overwrite"
echo ""

# CORS Configuration
echo "📌 CORS Configuration"
aws ssm put-parameter \
  --name "/mumzworld-togglebox-api-${STAGE}/cors-origin" \
  --type "String" \
  --value "*" \
  --region $REGION \
  --overwrite \
  --description "CORS allowed origins for ${STAGE}"

echo "   ✓ CORS parameters created"
echo ""

# Logging Configuration
echo "📌 Logging Configuration"
aws ssm put-parameter \
  --name "/mumzworld-togglebox-api-${STAGE}/log-level" \
  --type "String" \
  --value "info" \
  --region $REGION \
  --overwrite \
  --description "Log level for ${STAGE}"

echo "   ✓ Logging parameters created"
echo ""

# Check if JWT and API Key secrets exist
echo "📌 Auth Secrets"
if aws ssm get-parameter --name "/mumzworld-togglebox-api-${STAGE}/auth/jwt-secret" --region $REGION &>/dev/null; then
  echo "   ✓ JWT secret already exists"
else
  echo "   ⚠ JWT secret NOT found. Creating new secret..."
  JWT_SECRET=$(openssl rand -base64 32)
  aws ssm put-parameter \
    --name "/mumzworld-togglebox-api-${STAGE}/auth/jwt-secret" \
    --type "SecureString" \
    --value "$JWT_SECRET" \
    --region $REGION \
    --description "JWT signing secret for ToggleBox API ${STAGE}"
  echo "   ✓ JWT secret created"
fi

if aws ssm get-parameter --name "/mumzworld-togglebox-api-${STAGE}/auth/api-key-secret" --region $REGION &>/dev/null; then
  echo "   ✓ API Key secret already exists"
else
  echo "   ⚠ API Key secret NOT found. Creating new secret..."
  API_KEY_SECRET=$(openssl rand -base64 32)
  aws ssm put-parameter \
    --name "/mumzworld-togglebox-api-${STAGE}/auth/api-key-secret" \
    --type "SecureString" \
    --value "$API_KEY_SECRET" \
    --region $REGION \
    --description "API key hashing secret for ToggleBox API ${STAGE}"
  echo "   ✓ API Key secret created"
fi

echo ""
echo "============================================================"
echo "✅ SSM parameters setup complete for stage: $STAGE"
echo "============================================================"
echo ""
echo "📋 Created Parameters:"
echo "   - /mumzworld-togglebox-api-${STAGE}/custom-domain/domain-name"
echo "   - /mumzworld-togglebox-api-${STAGE}/custom-domain/certificate-arn"
echo "   - /mumzworld-togglebox-api-${STAGE}/dynamodb/table-prefix"
echo "   - /mumzworld-togglebox-api-${STAGE}/cache/enabled"
echo "   - /mumzworld-togglebox-api-${STAGE}/cache/provider"
echo "   - /mumzworld-togglebox-api-${STAGE}/cors-origin"
echo "   - /mumzworld-togglebox-api-${STAGE}/log-level"
echo "   - /mumzworld-togglebox-api-${STAGE}/auth/jwt-secret (SecureString)"
echo "   - /mumzworld-togglebox-api-${STAGE}/auth/api-key-secret (SecureString)"
echo ""
echo "📝 Next Steps:"
echo "   1. Set CloudFront distribution ID (if using cache)"
echo "   2. Verify all parameters: aws ssm get-parameters-by-path --path \"/mumzworld-togglebox-api-${STAGE}\" --region $REGION"
echo "   3. Deploy: npx serverless@3 deploy --stage ${STAGE} --region ${REGION}"
