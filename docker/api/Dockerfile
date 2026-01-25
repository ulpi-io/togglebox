# ============================================================================
# ToggleBox API - Production Dockerfile
# ============================================================================
# Multi-stage build for optimized production image
# Uses pnpm workspace to build API + dependencies from packages/
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder - Install dependencies and build everything
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

# Enable pnpm with specific version
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

# Copy workspace configuration files first (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy all packages
COPY packages/ ./packages/

# Copy API source code
COPY apps/api/ ./apps/api/

# Install ALL dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Generate Prisma client from schema (required before building packages)
RUN cd packages/database && npx prisma generate

# Build workspace packages first (dependencies of API)
RUN pnpm build:packages

# Build API
RUN pnpm --filter togglebox-api build

# ---------------------------------------------------------------------------
# Stage 2: Production - Minimal runtime image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Install production runtime dependencies only
RUN apk add --no-cache curl dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Enable pnpm with specific version
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

# Copy workspace configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy all package.json files for workspace resolution
COPY packages/core/package.json ./packages/core/
COPY packages/database/package.json ./packages/database/
COPY packages/cache/package.json ./packages/cache/
COPY packages/auth/package.json ./packages/auth/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/cache/dist ./packages/cache/dist
COPY --from=builder /app/packages/auth/dist ./packages/auth/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Set working directory to API
WORKDIR /app/apps/api

# Start with dumb-init for proper signal handling
CMD ["dumb-init", "node", "dist/index.js"]
