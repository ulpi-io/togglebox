#!/bin/bash

# ToggleBox Demo Data Seeding Script
# ===================================
# Populates the API with demo data for all example apps:
#   - Next.js (web/staging)
#   - Expo React Native (mobile/staging)
#   - Node.js API (ecommerce/development)
#
# Usage:
#   ./scripts/seed-demo-data.sh
#   API_URL=http://localhost:3000/api/v1 ./scripts/seed-demo-data.sh
#
# Requirements:
#   - API must be running: pnpm dev:api
#   - curl and jq must be installed
#
# What gets created:
#   1. Demo admin user (admin@togglebox.com / Parola123!)
#   2. API key for authenticated access
#   3. Platforms: web, mobile, ecommerce
#   4. Environments: staging (web/mobile), development (ecommerce)
#   5. Config Parameters: theme, apiTimeout (for SDK demos)
#   6. Feature Flags: dark-mode, new-checkout-flow
#   7. Experiments: checkout-test, cta-test, checkout-button-test, pricing-display-test

set -e

API_URL="${API_URL:-http://localhost:3000/api/v1}"
INTERNAL_URL="$API_URL/internal"

# Demo admin user credentials
ADMIN_NAME="ToggleBox Admin"
ADMIN_EMAIL="admin@togglebox.com"
ADMIN_PASSWORD="Parola123!"

# Will be set after authentication
JWT_TOKEN=""
API_KEY=""

echo "==================================================="
echo "ToggleBox Demo Data Seeding"
echo "==================================================="
echo "API URL: $API_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check for jq
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is required but not installed.${NC}"
  echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

# Helper function to make API calls
# Returns: HTTP_CODE|BODY
api_call() {
  local method=$1
  local path=$2
  local data=$3
  local auth_header=$4

  local headers=(-H "Content-Type: application/json")

  # Add authentication header if provided
  if [ -n "$auth_header" ]; then
    headers+=(-H "$auth_header")
  fi

  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$path" \
      "${headers[@]}" \
      -d "$data" 2>/dev/null) || true
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$path" \
      "${headers[@]}" 2>/dev/null) || true
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo "${http_code}|${body}"
}

# Helper function for authenticated API calls (prefers JWT_TOKEN for seeding)
auth_api_call() {
  local method=$1
  local path=$2
  local data=$3

  # Prefer JWT token for seeding as it's more reliable
  if [ -n "$JWT_TOKEN" ]; then
    api_call "$method" "$path" "$data" "Authorization: Bearer $JWT_TOKEN"
  elif [ -n "$API_KEY" ]; then
    api_call "$method" "$path" "$data" "X-API-Key: $API_KEY"
  else
    api_call "$method" "$path" "$data" ""
  fi
}

# Helper to print status
print_status() {
  local result=$1
  local success_msg=$2
  local exists_msg=$3
  local fail_msg=$4

  if [ "$result" = "201" ] || [ "$result" = "200" ]; then
    echo -e "${GREEN}✓${NC} $success_msg"
  elif [ "$result" = "409" ]; then
    echo -e "${YELLOW}⚠${NC} $exists_msg"
  else
    echo -e "${RED}✗${NC} $fail_msg (HTTP $result)"
  fi
}

# ============================================================================
# STEP 1: CREATE DEMO ADMIN USER
# ============================================================================

echo -e "${CYAN}Step 1: Setting up authentication...${NC}"
echo "---------------------------------------------------"

# Register demo admin user
echo -n "Registering demo user... "
register_response=$(api_call POST "$API_URL/auth/register" "{
  \"name\": \"$ADMIN_NAME\",
  \"email\": \"$ADMIN_EMAIL\",
  \"password\": \"$ADMIN_PASSWORD\"
}")

register_code=$(echo "$register_response" | cut -d'|' -f1)
register_body=$(echo "$register_response" | cut -d'|' -f2-)

if [ "$register_code" = "201" ] || [ "$register_code" = "200" ]; then
  echo -e "${GREEN}created${NC}"
elif [ "$register_code" = "409" ]; then
  echo -e "${YELLOW}already exists${NC}"
else
  echo -e "${YELLOW}skipped (HTTP $register_code)${NC}"
fi

# Login to get JWT token
echo -n "Logging in... "
login_response=$(api_call POST "$API_URL/auth/login" "{
  \"email\": \"$ADMIN_EMAIL\",
  \"password\": \"$ADMIN_PASSWORD\"
}")

login_code=$(echo "$login_response" | cut -d'|' -f1)
login_body=$(echo "$login_response" | cut -d'|' -f2-)

if [ "$login_code" = "200" ]; then
  JWT_TOKEN=$(echo "$login_body" | jq -r '.data.token // .token // empty')
  if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
    echo -e "${GREEN}success${NC}"
  else
    echo -e "${RED}failed (no token in response)${NC}"
    echo "Response: $login_body"
    exit 1
  fi
else
  echo -e "${RED}failed (HTTP $login_code)${NC}"
  echo "Response: $login_body"
  echo ""
  echo "Make sure the API is running with authentication enabled:"
  echo "  ENABLE_AUTHENTICATION=true pnpm dev:api"
  exit 1
fi

# Create API key for subsequent operations
echo -n "Creating API key... "
apikey_response=$(api_call POST "$API_URL/api-keys" '{
  "name": "Demo Seed Script Key",
  "permissions": [
    "config:read",
    "config:write",
    "config:delete",
    "cache:invalidate",
    "user:manage",
    "apikey:manage"
  ]
}' "Authorization: Bearer $JWT_TOKEN")

apikey_code=$(echo "$apikey_response" | cut -d'|' -f1)
apikey_body=$(echo "$apikey_response" | cut -d'|' -f2-)

if [ "$apikey_code" = "201" ] || [ "$apikey_code" = "200" ]; then
  API_KEY=$(echo "$apikey_body" | jq -r '.data.key // .key // empty')
  if [ -n "$API_KEY" ] && [ "$API_KEY" != "null" ]; then
    echo -e "${GREEN}created${NC}"
    # Mask the key for display
    key_prefix=$(echo "$API_KEY" | cut -c1-8)
    key_suffix=$(echo "$API_KEY" | rev | cut -c1-4 | rev)
    echo -e "  API Key: ${key_prefix}...${key_suffix}"
  else
    echo -e "${YELLOW}created but no key returned (using JWT)${NC}"
  fi
else
  echo -e "${YELLOW}skipped (HTTP $apikey_code) - using JWT token${NC}"
fi

echo ""

# ============================================================================
# STEP 2: CREATE PLATFORMS
# ============================================================================

echo -e "${BLUE}Step 2: Creating platforms...${NC}"
echo "---------------------------------------------------"

# Platform: web (Next.js example)
response=$(auth_api_call POST "$INTERNAL_URL/platforms" '{
  "name": "web",
  "description": "Web platform for Next.js SDK example"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Platform 'web' created" "Platform 'web' already exists" "Failed to create platform 'web'"

# Platform: mobile (Expo example)
response=$(auth_api_call POST "$INTERNAL_URL/platforms" '{
  "name": "mobile",
  "description": "Mobile platform for Expo/React Native SDK example"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Platform 'mobile' created" "Platform 'mobile' already exists" "Failed to create platform 'mobile'"

# Platform: ecommerce (Node.js example)
response=$(auth_api_call POST "$INTERNAL_URL/platforms" '{
  "name": "ecommerce",
  "description": "E-commerce platform for Node.js SDK example"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Platform 'ecommerce' created" "Platform 'ecommerce' already exists" "Failed to create platform 'ecommerce'"

# ============================================================================
# STEP 3: CREATE ENVIRONMENTS
# ============================================================================

echo ""
echo -e "${BLUE}Step 3: Creating environments...${NC}"
echo "---------------------------------------------------"

# Environment: web/staging
response=$(auth_api_call POST "$INTERNAL_URL/platforms/web/environments" '{
  "name": "staging",
  "description": "Staging environment for Next.js example"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Environment 'web/staging' created" "Environment 'web/staging' already exists" "Failed to create environment 'web/staging'"

# Environment: mobile/staging
response=$(auth_api_call POST "$INTERNAL_URL/platforms/mobile/environments" '{
  "name": "staging",
  "description": "Staging environment for Expo example"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Environment 'mobile/staging' created" "Environment 'mobile/staging' already exists" "Failed to create environment 'mobile/staging'"

# Environment: ecommerce/development
response=$(auth_api_call POST "$INTERNAL_URL/platforms/ecommerce/environments" '{
  "name": "development",
  "description": "Development environment for Node.js example"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Environment 'ecommerce/development' created" "Environment 'ecommerce/development' already exists" "Failed to create environment 'ecommerce/development'"

# ============================================================================
# STEP 4: CREATE CONFIG PARAMETERS (Tier 1)
# Used by: Next.js use-config, Expo use-config
# ============================================================================

echo ""
echo -e "${BLUE}Step 4: Creating config parameters...${NC}"
echo "---------------------------------------------------"

# Config: web/staging/theme
# Used in: apps/example-nextjs/src/app/examples/quick/use-config/page.tsx:27
response=$(auth_api_call POST "$INTERNAL_URL/platforms/web/environments/staging/configs" '{
  "parameterKey": "theme",
  "valueType": "string",
  "defaultValue": "dark",
  "description": "UI theme (light/dark)",
  "parameterGroup": "appearance",
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Config 'web/staging/theme' created" "Config 'web/staging/theme' already exists" "Failed to create config 'web/staging/theme'"

# Config: web/staging/apiTimeout
# Used in: apps/example-nextjs/src/app/examples/quick/use-config/page.tsx:28
response=$(auth_api_call POST "$INTERNAL_URL/platforms/web/environments/staging/configs" '{
  "parameterKey": "apiTimeout",
  "valueType": "number",
  "defaultValue": "3000",
  "description": "API request timeout in milliseconds",
  "parameterGroup": "network",
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Config 'web/staging/apiTimeout' created" "Config 'web/staging/apiTimeout' already exists" "Failed to create config 'web/staging/apiTimeout'"

# Config: mobile/staging/theme
# Used in: apps/example-expo/app/examples/quick/use-config.tsx:26
response=$(auth_api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/configs" '{
  "parameterKey": "theme",
  "valueType": "string",
  "defaultValue": "dark",
  "description": "UI theme (light/dark/system)",
  "parameterGroup": "appearance",
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Config 'mobile/staging/theme' created" "Config 'mobile/staging/theme' already exists" "Failed to create config 'mobile/staging/theme'"

# Config: mobile/staging/apiTimeout
# Used in: apps/example-expo/app/examples/quick/use-config.tsx:27
response=$(auth_api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/configs" '{
  "parameterKey": "apiTimeout",
  "valueType": "number",
  "defaultValue": "5000",
  "description": "API request timeout in milliseconds",
  "parameterGroup": "network",
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Config 'mobile/staging/apiTimeout' created" "Config 'mobile/staging/apiTimeout' already exists" "Failed to create config 'mobile/staging/apiTimeout'"

# ============================================================================
# STEP 5: CREATE FEATURE FLAGS (Tier 2)
# ============================================================================

echo ""
echo -e "${BLUE}Step 5: Creating feature flags...${NC}"
echo "---------------------------------------------------"

# Flag: web/staging/dark-mode
# Used in: apps/example-nextjs/src/app/examples/quick/use-flag/page.tsx:11
response=$(auth_api_call POST "$INTERNAL_URL/platforms/web/environments/staging/flags" '{
  "flagKey": "dark-mode",
  "name": "Dark Mode",
  "description": "Enable dark mode theme for the application",
  "enabled": true,
  "flagType": "boolean",
  "valueA": true,
  "valueB": false,
  "defaultValue": "A",
  "rolloutEnabled": false,
  "rolloutPercentageA": 100,
  "rolloutPercentageB": 0,
  "targeting": {
    "countries": [],
    "forceIncludeUsers": [],
    "forceExcludeUsers": []
  },
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Flag 'web/staging/dark-mode' created" "Flag 'web/staging/dark-mode' already exists" "Failed to create flag 'web/staging/dark-mode'"

# Flag: mobile/staging/dark-mode
# Used in: apps/example-expo/app/examples/quick/use-flag.tsx:10
response=$(auth_api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/flags" '{
  "flagKey": "dark-mode",
  "name": "Dark Mode",
  "description": "Enable dark mode theme for mobile app",
  "enabled": true,
  "flagType": "boolean",
  "valueA": true,
  "valueB": false,
  "defaultValue": "A",
  "rolloutEnabled": false,
  "rolloutPercentageA": 100,
  "rolloutPercentageB": 0,
  "targeting": {
    "countries": [],
    "forceIncludeUsers": [],
    "forceExcludeUsers": []
  },
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Flag 'mobile/staging/dark-mode' created" "Flag 'mobile/staging/dark-mode' already exists" "Failed to create flag 'mobile/staging/dark-mode'"

# Flag: ecommerce/development/new-checkout-flow
# Used in: apps/example-nodejs/src/routes/checkout.routes.ts:20-23
response=$(auth_api_call POST "$INTERNAL_URL/platforms/ecommerce/environments/development/flags" '{
  "flagKey": "new-checkout-flow",
  "name": "New Checkout Flow",
  "description": "Enable the new streamlined checkout experience",
  "enabled": true,
  "flagType": "boolean",
  "valueA": true,
  "valueB": false,
  "defaultValue": "A",
  "rolloutEnabled": true,
  "rolloutPercentageA": 50,
  "rolloutPercentageB": 50,
  "targeting": {
    "countries": [],
    "forceIncludeUsers": [],
    "forceExcludeUsers": []
  },
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Flag 'ecommerce/development/new-checkout-flow' created" "Flag 'ecommerce/development/new-checkout-flow' already exists" "Failed to create flag 'ecommerce/development/new-checkout-flow'"

# Additional demo flags for variety
response=$(auth_api_call POST "$INTERNAL_URL/platforms/web/environments/staging/flags" '{
  "flagKey": "beta-features",
  "name": "Beta Features",
  "description": "Enable beta features for early adopters",
  "enabled": false,
  "flagType": "boolean",
  "valueA": true,
  "valueB": false,
  "defaultValue": "B",
  "rolloutEnabled": true,
  "rolloutPercentageA": 10,
  "rolloutPercentageB": 90,
  "targeting": {
    "countries": [
      {"country": "US", "serveValue": "A"},
      {"country": "CA", "serveValue": "A"}
    ],
    "forceIncludeUsers": ["beta-tester-1", "beta-tester-2"],
    "forceExcludeUsers": []
  },
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Flag 'web/staging/beta-features' created" "Flag 'web/staging/beta-features' already exists" "Failed to create flag 'web/staging/beta-features'"

response=$(auth_api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/flags" '{
  "flagKey": "biometric-auth",
  "name": "Biometric Authentication",
  "description": "Enable fingerprint/face authentication",
  "enabled": true,
  "flagType": "boolean",
  "valueA": true,
  "valueB": false,
  "defaultValue": "A",
  "rolloutEnabled": true,
  "rolloutPercentageA": 80,
  "rolloutPercentageB": 20,
  "targeting": {
    "countries": [],
    "forceIncludeUsers": [],
    "forceExcludeUsers": []
  },
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Flag 'mobile/staging/biometric-auth' created" "Flag 'mobile/staging/biometric-auth' already exists" "Failed to create flag 'mobile/staging/biometric-auth'"

# ============================================================================
# STEP 6: CREATE EXPERIMENTS (Tier 3)
# ============================================================================

echo ""
echo -e "${BLUE}Step 6: Creating experiments...${NC}"
echo "---------------------------------------------------"

# Experiment: web/staging/checkout-test
# Used in: apps/example-nextjs/src/app/examples/quick/use-experiment/page.tsx:7
# Variants: control (line 39), variant-a (line 35)
response=$(auth_api_call POST "$INTERNAL_URL/platforms/web/environments/staging/experiments" '{
  "experimentKey": "checkout-test",
  "name": "Checkout Flow A/B Test",
  "description": "Testing different checkout button variations",
  "hypothesis": "A one-click purchase button will increase checkout completion by 15%",
  "variations": [
    {
      "key": "control",
      "name": "Standard Checkout",
      "value": {"buttonText": "Proceed to Checkout", "layout": "multi-step"},
      "isControl": true
    },
    {
      "key": "variant_a",
      "name": "One-Click Purchase",
      "value": {"buttonText": "One-Click Purchase", "layout": "single-step"},
      "isControl": false
    },
    {
      "key": "variant_b",
      "name": "Express Checkout",
      "value": {"buttonText": "Express Checkout", "layout": "express"},
      "isControl": false
    }
  ],
  "controlVariation": "control",
  "trafficAllocation": [
    {"variationKey": "control", "percentage": 34},
    {"variationKey": "variant_a", "percentage": 33},
    {"variationKey": "variant_b", "percentage": 33}
  ],
  "targeting": {
    "countries": [],
    "forceIncludeUsers": [],
    "forceExcludeUsers": []
  },
  "primaryMetric": {
    "id": "checkout-completion",
    "name": "Checkout Completion Rate",
    "eventName": "checkout_completed",
    "metricType": "conversion",
    "successDirection": "increase"
  },
  "confidenceLevel": 0.95,
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Experiment 'web/staging/checkout-test' created" "Experiment 'web/staging/checkout-test' already exists" "Failed to create experiment 'web/staging/checkout-test'"

# Start the experiment so it's in running state
response=$(auth_api_call POST "$INTERNAL_URL/platforms/web/environments/staging/experiments/checkout-test/start" '{
  "startedBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
if [ "$result" = "200" ] || [ "$result" = "201" ]; then
  echo -e "${GREEN}✓${NC} Experiment 'checkout-test' started"
elif [ "$result" = "400" ] || [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Experiment 'checkout-test' already running or cannot be started"
fi

# Experiment: mobile/staging/cta-test
# Used in: apps/example-expo/app/examples/quick/use-experiment.tsx:10
# Variants: control, variant-a, variant-b (lines 21-25)
response=$(auth_api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/experiments" '{
  "experimentKey": "cta-test",
  "name": "CTA Button Text Test",
  "description": "Testing different call-to-action button text",
  "hypothesis": "Action-oriented CTA text will increase click-through rate by 20%",
  "variations": [
    {
      "key": "control",
      "name": "Get Started",
      "value": {"buttonText": "Get Started", "style": "default"},
      "isControl": true
    },
    {
      "key": "variant_a",
      "name": "Start Free Trial",
      "value": {"buttonText": "Start Free Trial", "style": "prominent"},
      "isControl": false
    },
    {
      "key": "variant_b",
      "name": "Try It Now",
      "value": {"buttonText": "Try It Now!", "style": "urgent"},
      "isControl": false
    }
  ],
  "controlVariation": "control",
  "trafficAllocation": [
    {"variationKey": "control", "percentage": 34},
    {"variationKey": "variant_a", "percentage": 33},
    {"variationKey": "variant_b", "percentage": 33}
  ],
  "targeting": {
    "countries": [],
    "forceIncludeUsers": [],
    "forceExcludeUsers": []
  },
  "primaryMetric": {
    "id": "cta-click",
    "name": "CTA Click Rate",
    "eventName": "cta_clicked",
    "metricType": "conversion",
    "successDirection": "increase"
  },
  "confidenceLevel": 0.95,
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Experiment 'mobile/staging/cta-test' created" "Experiment 'mobile/staging/cta-test' already exists" "Failed to create experiment 'mobile/staging/cta-test'"

# Start the experiment
response=$(auth_api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/experiments/cta-test/start" '{
  "startedBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
if [ "$result" = "200" ] || [ "$result" = "201" ]; then
  echo -e "${GREEN}✓${NC} Experiment 'cta-test' started"
elif [ "$result" = "400" ] || [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Experiment 'cta-test' already running or cannot be started"
fi

# Experiment: ecommerce/development/checkout-button-test
# Used in: apps/example-nodejs/src/routes/checkout.routes.ts:26-53
# Variants: buy-now, purchase, add-to-cart (lines 49-52)
response=$(auth_api_call POST "$INTERNAL_URL/platforms/ecommerce/environments/development/experiments" '{
  "experimentKey": "checkout-button-test",
  "name": "Checkout Button Label Test",
  "description": "Testing different checkout button labels for conversion",
  "hypothesis": "Clear action-oriented labels will increase purchase conversion by 10%",
  "variations": [
    {
      "key": "purchase",
      "name": "Complete Purchase",
      "value": {"buttonText": "Complete Purchase", "color": "blue"},
      "isControl": true
    },
    {
      "key": "buy_now",
      "name": "Buy Now",
      "value": {"buttonText": "Buy Now", "color": "green"},
      "isControl": false
    },
    {
      "key": "add_to_cart",
      "name": "Add to Cart",
      "value": {"buttonText": "Add to Cart", "color": "orange"},
      "isControl": false
    }
  ],
  "controlVariation": "purchase",
  "trafficAllocation": [
    {"variationKey": "purchase", "percentage": 34},
    {"variationKey": "buy_now", "percentage": 33},
    {"variationKey": "add_to_cart", "percentage": 33}
  ],
  "targeting": {
    "countries": [],
    "forceIncludeUsers": [],
    "forceExcludeUsers": []
  },
  "primaryMetric": {
    "id": "purchase",
    "name": "Purchase Conversion",
    "eventName": "purchase",
    "metricType": "conversion",
    "successDirection": "increase"
  },
  "confidenceLevel": 0.95,
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Experiment 'ecommerce/development/checkout-button-test' created" "Experiment 'ecommerce/development/checkout-button-test' already exists" "Failed to create experiment 'ecommerce/development/checkout-button-test'"

# Start the experiment
response=$(auth_api_call POST "$INTERNAL_URL/platforms/ecommerce/environments/development/experiments/checkout-button-test/start" '{
  "startedBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
if [ "$result" = "200" ] || [ "$result" = "201" ]; then
  echo -e "${GREEN}✓${NC} Experiment 'checkout-button-test' started"
elif [ "$result" = "400" ] || [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Experiment 'checkout-button-test' already running or cannot be started"
fi

# Experiment: ecommerce/development/pricing-display-test
# Used in: apps/example-nodejs/src/routes/checkout.routes.ts:32-35, 69
# Variants: tax-included, tax-excluded
response=$(auth_api_call POST "$INTERNAL_URL/platforms/ecommerce/environments/development/experiments" '{
  "experimentKey": "pricing-display-test",
  "name": "Pricing Display Test",
  "description": "Testing tax-inclusive vs tax-exclusive pricing display",
  "hypothesis": "Showing tax-included prices will reduce cart abandonment by 5%",
  "variations": [
    {
      "key": "tax_excluded",
      "name": "Tax Excluded Display",
      "value": {"showTaxIncluded": false, "taxLabel": "+ tax at checkout"},
      "isControl": true
    },
    {
      "key": "tax_included",
      "name": "Tax Included Display",
      "value": {"showTaxIncluded": true, "taxLabel": "tax included"},
      "isControl": false
    }
  ],
  "controlVariation": "tax_excluded",
  "trafficAllocation": [
    {"variationKey": "tax_excluded", "percentage": 50},
    {"variationKey": "tax_included", "percentage": 50}
  ],
  "targeting": {
    "countries": [],
    "forceIncludeUsers": [],
    "forceExcludeUsers": []
  },
  "primaryMetric": {
    "id": "purchase",
    "name": "Purchase Conversion",
    "eventName": "purchase",
    "metricType": "conversion",
    "successDirection": "increase"
  },
  "confidenceLevel": 0.95,
  "createdBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
print_status "$result" "Experiment 'ecommerce/development/pricing-display-test' created" "Experiment 'ecommerce/development/pricing-display-test' already exists" "Failed to create experiment 'ecommerce/development/pricing-display-test'"

# Start the experiment
response=$(auth_api_call POST "$INTERNAL_URL/platforms/ecommerce/environments/development/experiments/pricing-display-test/start" '{
  "startedBy": "'"$ADMIN_EMAIL"'"
}')
result=$(echo "$response" | cut -d'|' -f1)
if [ "$result" = "200" ] || [ "$result" = "201" ]; then
  echo -e "${GREEN}✓${NC} Experiment 'pricing-display-test' started"
elif [ "$result" = "400" ] || [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Experiment 'pricing-display-test' already running or cannot be started"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "==================================================="
echo -e "${GREEN}Demo data seeding complete!${NC}"
echo "==================================================="
echo ""
echo "Demo Admin Account:"
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
if [ -n "$API_KEY" ] && [ "$API_KEY" != "null" ]; then
  echo "API Key (for SDK configuration):"
  echo "  $API_KEY"
  echo ""
fi
echo "What was created:"
echo ""
echo "  Platforms:"
echo "    - web         (Next.js SDK example)"
echo "    - mobile      (Expo SDK example)"
echo "    - ecommerce   (Node.js SDK example)"
echo ""
echo "  Environments:"
echo "    - web/staging"
echo "    - mobile/staging"
echo "    - ecommerce/development"
echo ""
echo "  Config Parameters:"
echo "    - web/staging: theme, apiTimeout"
echo "    - mobile/staging: theme, apiTimeout"
echo ""
echo "  Feature Flags:"
echo "    - web/staging: dark-mode, beta-features"
echo "    - mobile/staging: dark-mode, biometric-auth"
echo "    - ecommerce/development: new-checkout-flow"
echo ""
echo "  Experiments (running):"
echo "    - web/staging: checkout-test"
echo "    - mobile/staging: cta-test"
echo "    - ecommerce/development: checkout-button-test, pricing-display-test"
echo ""
echo "---------------------------------------------------"
echo "Run the example apps:"
echo ""
echo "  Next.js:    pnpm dev:example-nextjs"
echo "  Expo:       pnpm dev:example-expo"
echo "  Node.js:    pnpm dev:example-nodejs"
echo ""
echo "Access points:"
echo "  - API:              http://localhost:3000"
echo "  - Admin Dashboard:  http://localhost:3001"
echo "  - Next.js Example:  http://localhost:3002"
echo "  - Node.js Example:  http://localhost:3003"
echo ""
echo "Configure example apps with the API key:"
echo "  NEXT_PUBLIC_API_KEY=<api-key> pnpm dev:example-nextjs"
echo "  EXPO_PUBLIC_API_KEY=<api-key> pnpm dev:example-expo"
echo "  TOGGLEBOX_API_KEY=<api-key> pnpm dev:example-nodejs"
echo ""
