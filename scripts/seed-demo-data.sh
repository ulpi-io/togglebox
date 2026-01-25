#!/bin/bash

# ToggleBox Demo Data Seeding Script
# This script populates the API with demo data for the example apps.
#
# Usage:
#   ./scripts/seed-demo-data.sh
#   API_URL=http://localhost:3000/api/v1 ./scripts/seed-demo-data.sh
#
# Requirements:
#   - API must be running
#   - curl must be installed

set -e

API_URL="${API_URL:-http://localhost:3000/api/v1}"
INTERNAL_URL="$API_URL/internal"

echo "==================================================="
echo "ToggleBox Demo Data Seeding"
echo "==================================================="
echo "API URL: $API_URL"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to make API calls
api_call() {
  local method=$1
  local path=$2
  local data=$3

  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$path" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null) || true
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$path" \
      -H "Content-Type: application/json" 2>/dev/null) || true
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo "$http_code"
}

echo "Creating platforms..."
echo "---------------------------------------------------"

# Create 'web' platform
result=$(api_call POST "$INTERNAL_URL/platforms" '{"name":"web","description":"Web application platform for Next.js example"}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Platform 'web' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Platform 'web' already exists"
else
  echo -e "${RED}✗${NC} Failed to create platform 'web' (HTTP $result)"
fi

# Create 'mobile' platform
result=$(api_call POST "$INTERNAL_URL/platforms" '{"name":"mobile","description":"Mobile application platform for Expo example"}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Platform 'mobile' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Platform 'mobile' already exists"
else
  echo -e "${RED}✗${NC} Failed to create platform 'mobile' (HTTP $result)"
fi

echo ""
echo "Creating environments..."
echo "---------------------------------------------------"

# Create 'staging' environment for web
result=$(api_call POST "$INTERNAL_URL/platforms/web/environments" '{"name":"staging","description":"Staging environment for testing"}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Environment 'web/staging' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Environment 'web/staging' already exists"
else
  echo -e "${RED}✗${NC} Failed to create environment 'web/staging' (HTTP $result)"
fi

# Create 'staging' environment for mobile
result=$(api_call POST "$INTERNAL_URL/platforms/mobile/environments" '{"name":"staging","description":"Staging environment for testing"}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Environment 'mobile/staging' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Environment 'mobile/staging' already exists"
else
  echo -e "${RED}✗${NC} Failed to create environment 'mobile/staging' (HTTP $result)"
fi

echo ""
echo "Creating configuration versions..."
echo "---------------------------------------------------"

# Create config version 1.0.0 for web
result=$(api_call POST "$INTERNAL_URL/platforms/web/environments/staging/versions" '{
  "version": "1.0.0",
  "config": {
    "theme": "light",
    "apiTimeout": 5000,
    "maxRetries": 3,
    "features": {
      "chat": true,
      "notifications": false
    },
    "analytics": {
      "enabled": true,
      "sampleRate": 0.1
    }
  },
  "isStable": false
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Config version 'web/staging/1.0.0' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Config version 'web/staging/1.0.0' already exists"
else
  echo -e "${RED}✗${NC} Failed to create config version 'web/staging/1.0.0' (HTTP $result)"
fi

# Create config version 1.1.0 for web (stable)
result=$(api_call POST "$INTERNAL_URL/platforms/web/environments/staging/versions" '{
  "version": "1.1.0",
  "config": {
    "theme": "dark",
    "apiTimeout": 3000,
    "maxRetries": 5,
    "features": {
      "chat": true,
      "notifications": true,
      "darkMode": true
    },
    "analytics": {
      "enabled": true,
      "sampleRate": 0.25
    },
    "newFeature": {
      "enabled": true,
      "variant": "B"
    }
  },
  "isStable": true
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Config version 'web/staging/1.1.0' (stable) created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Config version 'web/staging/1.1.0' already exists"
else
  echo -e "${RED}✗${NC} Failed to create config version 'web/staging/1.1.0' (HTTP $result)"
fi

# Create config versions for mobile
result=$(api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/versions" '{
  "version": "1.0.0",
  "config": {
    "theme": "system",
    "cacheTimeout": 3600,
    "offlineMode": true,
    "pushNotifications": {
      "enabled": true,
      "sound": true
    }
  },
  "isStable": true
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Config version 'mobile/staging/1.0.0' (stable) created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Config version 'mobile/staging/1.0.0' already exists"
else
  echo -e "${RED}✗${NC} Failed to create config version 'mobile/staging/1.0.0' (HTTP $result)"
fi

echo ""
echo "Creating feature flags..."
echo "---------------------------------------------------"

# Create 'dark-mode' flag for web
result=$(api_call POST "$INTERNAL_URL/platforms/web/environments/staging/flags" '{
  "flagKey": "dark-mode",
  "description": "Enable dark mode theme",
  "enabled": true,
  "valueA": "enabled",
  "valueB": "disabled",
  "rolloutPercentage": 100,
  "targeting": [
    {"attribute": "country", "values": ["US", "CA", "UK"]}
  ]
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Flag 'web/staging/dark-mode' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Flag 'web/staging/dark-mode' already exists"
else
  echo -e "${RED}✗${NC} Failed to create flag 'web/staging/dark-mode' (HTTP $result)"
fi

# Create 'new-checkout' flag for web
result=$(api_call POST "$INTERNAL_URL/platforms/web/environments/staging/flags" '{
  "flagKey": "new-checkout",
  "description": "New checkout flow with improved UX",
  "enabled": true,
  "valueA": "v2",
  "valueB": "v1",
  "rolloutPercentage": 50,
  "targeting": []
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Flag 'web/staging/new-checkout' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Flag 'web/staging/new-checkout' already exists"
else
  echo -e "${RED}✗${NC} Failed to create flag 'web/staging/new-checkout' (HTTP $result)"
fi

# Create 'beta-features' flag for web
result=$(api_call POST "$INTERNAL_URL/platforms/web/environments/staging/flags" '{
  "flagKey": "beta-features",
  "description": "Enable beta features for early adopters",
  "enabled": false,
  "valueA": "enabled",
  "valueB": "disabled",
  "rolloutPercentage": 10,
  "targeting": [
    {"attribute": "language", "values": ["en", "es"]}
  ]
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Flag 'web/staging/beta-features' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Flag 'web/staging/beta-features' already exists"
else
  echo -e "${RED}✗${NC} Failed to create flag 'web/staging/beta-features' (HTTP $result)"
fi

# Create flags for mobile
result=$(api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/flags" '{
  "flagKey": "offline-mode",
  "description": "Enable offline mode with local caching",
  "enabled": true,
  "valueA": "full",
  "valueB": "partial",
  "rolloutPercentage": 100,
  "targeting": []
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Flag 'mobile/staging/offline-mode' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Flag 'mobile/staging/offline-mode' already exists"
else
  echo -e "${RED}✗${NC} Failed to create flag 'mobile/staging/offline-mode' (HTTP $result)"
fi

result=$(api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/flags" '{
  "flagKey": "biometric-auth",
  "description": "Enable biometric authentication",
  "enabled": true,
  "valueA": "enabled",
  "valueB": "disabled",
  "rolloutPercentage": 80,
  "targeting": []
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Flag 'mobile/staging/biometric-auth' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Flag 'mobile/staging/biometric-auth' already exists"
else
  echo -e "${RED}✗${NC} Failed to create flag 'mobile/staging/biometric-auth' (HTTP $result)"
fi

echo ""
echo "Creating experiments..."
echo "---------------------------------------------------"

# Create 'checkout-test' experiment for web
result=$(api_call POST "$INTERNAL_URL/platforms/web/environments/staging/experiments" '{
  "experimentKey": "checkout-test",
  "description": "A/B test for new checkout flow",
  "status": "running",
  "variations": [
    {"variationKey": "control", "name": "Control (Current)", "weight": 50},
    {"variationKey": "variant-b", "name": "Variant B (New Flow)", "weight": 50}
  ]
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Experiment 'web/staging/checkout-test' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Experiment 'web/staging/checkout-test' already exists"
else
  echo -e "${RED}✗${NC} Failed to create experiment 'web/staging/checkout-test' (HTTP $result)"
fi

# Create 'pricing-page' experiment for web
result=$(api_call POST "$INTERNAL_URL/platforms/web/environments/staging/experiments" '{
  "experimentKey": "pricing-page",
  "description": "Testing different pricing page layouts",
  "status": "draft",
  "variations": [
    {"variationKey": "original", "name": "Original Layout", "weight": 33},
    {"variationKey": "minimal", "name": "Minimal Layout", "weight": 33},
    {"variationKey": "detailed", "name": "Detailed Layout", "weight": 34}
  ]
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Experiment 'web/staging/pricing-page' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Experiment 'web/staging/pricing-page' already exists"
else
  echo -e "${RED}✗${NC} Failed to create experiment 'web/staging/pricing-page' (HTTP $result)"
fi

# Create experiments for mobile
result=$(api_call POST "$INTERNAL_URL/platforms/mobile/environments/staging/experiments" '{
  "experimentKey": "onboarding-flow",
  "description": "Testing different onboarding experiences",
  "status": "running",
  "variations": [
    {"variationKey": "standard", "name": "Standard Onboarding", "weight": 50},
    {"variationKey": "simplified", "name": "Simplified Onboarding", "weight": 50}
  ]
}')
if [ "$result" = "201" ] || [ "$result" = "200" ]; then
  echo -e "${GREEN}✓${NC} Experiment 'mobile/staging/onboarding-flow' created"
elif [ "$result" = "409" ]; then
  echo -e "${YELLOW}⚠${NC} Experiment 'mobile/staging/onboarding-flow' already exists"
else
  echo -e "${RED}✗${NC} Failed to create experiment 'mobile/staging/onboarding-flow' (HTTP $result)"
fi

echo ""
echo "==================================================="
echo -e "${GREEN}Demo data seeding complete!${NC}"
echo "==================================================="
echo ""
echo "You can now run the example apps:"
echo "  - Next.js: pnpm dev:example-nextjs"
echo "  - Expo:    pnpm dev:example-expo"
echo ""
echo "Access points:"
echo "  - Next.js Example: http://localhost:3002"
echo "  - API:             http://localhost:3000"
echo ""
