# Dockerfile - Fixed version
FROM node:18-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy ALL files FIRST
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
COPY healthcheck.js ./

# THEN install and build
RUN npm install && npm run build

# Verify dist was created
RUN ls -la dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node healthcheck.js

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
