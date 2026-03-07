# Dockerfile - Fixed version with build inside
FROM node:18-alpine AS builder

# Install dumb-init
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy all source files
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY healthcheck.js ./

# Install ALL dependencies (including dev) and build
RUN npm install
RUN npm run build

# Production stage
FROM node:18-alpine

# Install dumb-init
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/healthcheck.js ./
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
