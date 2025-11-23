# Use official Node.js LTS (Long Term Support) runtime as base image
FROM node:18-alpine AS base

# Set working directory inside container
WORKDIR /app

# Copy package files for dependency installation
COPY package.json ./
COPY yarn.lock ./

# Install dependencies using yarn (remove frozen lockfile temporarily for new dependency)
RUN yarn install --production=false

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY jest.config.ts ./
COPY prettierrc.json ./

# Build TypeScript application
RUN yarn build

# Transform path aliases to relative imports
RUN npx tsc-alias

# Production stage - multi-stage build for smaller image
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY yarn.lock ./

# Install only production dependencies
RUN yarn install --production=true && yarn cache clean

# Copy built application from build stage (exclude test files)
COPY --from=base /app/dist ./dist/
COPY --from=base /app/src/static ./src/static/
# Remove test files that contain unresolved @root imports
RUN find ./dist -name "*.test.js" -delete

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (matching your Cloud Run deployment configuration)
EXPOSE 5000

# Health check (uses PORT environment variable)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || process.env.SERVER_PORT || 5000) + '/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application using PM2 (as defined in your package.json start script)
CMD ["yarn", "start"]
