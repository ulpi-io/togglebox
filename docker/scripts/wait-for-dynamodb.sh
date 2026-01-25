#!/bin/sh

# ============================================================================
# Wait for DynamoDB Local to be ready
# ============================================================================

ENDPOINT="${DYNAMODB_ENDPOINT:-http://dynamodb-local:8000}"
REGION="${AWS_REGION:-us-east-1}"
MAX_ATTEMPTS=30
ATTEMPT=1

echo "Waiting for DynamoDB Local to be ready at ${ENDPOINT}..."

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if aws dynamodb list-tables \
        --endpoint-url "${ENDPOINT}" \
        --region "${REGION}" \
        --no-cli-pager > /dev/null 2>&1; then
        echo "DynamoDB Local is ready!"
        exit 0
    fi

    echo "Attempt ${ATTEMPT}/${MAX_ATTEMPTS}: DynamoDB not ready yet..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

echo "DynamoDB Local failed to become ready after ${MAX_ATTEMPTS} attempts"
exit 1
