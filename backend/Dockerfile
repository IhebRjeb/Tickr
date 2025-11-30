# Tickr Backend - Production Dockerfile
# Multi-stage build optimized for production

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for building
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Install production dependencies
RUN apk add --no-cache \
    curl \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
