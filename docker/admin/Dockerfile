# ============================================================================
# ToggleBox Admin - Production Dockerfile
# ============================================================================
# Multi-stage build for optimized Next.js production image
# Uses pnpm workspace to build admin dashboard
# ============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder - Install dependencies and build Next.js app
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for Next.js
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++

# Enable pnpm with specific version
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

# Copy workspace configuration files first (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy all packages (in case admin depends on them)
COPY packages/ ./packages/

# Copy admin source code
COPY apps/admin/ ./apps/admin/

# Install ALL dependencies (including devDependencies needed for build)
RUN pnpm install --frozen-lockfile

# Build workspace packages if needed
RUN pnpm build:packages || true

# Set environment variables for Next.js build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js admin dashboard
RUN pnpm --filter "@togglebox/admin" build

# ---------------------------------------------------------------------------
# Stage 2: Production - Minimal runtime image for Next.js
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Install production runtime dependencies
RUN apk add --no-cache curl dumb-init libc6-compat

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Enable pnpm with specific version
RUN corepack enable && corepack prepare pnpm@8.12.0 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/admin/package.json ./apps/admin/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --filter "@togglebox/admin"

# Copy Next.js build artifacts from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/package.json ./apps/admin/

# Copy Next.js configuration
COPY --chown=nextjs:nodejs apps/admin/next.config.* ./apps/admin/

# Switch to non-root user
USER nextjs

# Expose admin port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Set working directory to admin app
WORKDIR /app/apps/admin

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

# Start Next.js with dumb-init for proper signal handling
CMD ["dumb-init", "pnpm", "start"]
