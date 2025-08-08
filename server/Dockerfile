# Use official Node.js LTS (Long Term Support) runtime as base image
FROM node:18-alpine AS base

# Set working directory inside container
WORKDIR /app

# Copy package files for dependency installation
COPY package.json ./
COPY yarn.lock ./

# Install dependencies using yarn (as indicated by yarn.lock presence)
RUN yarn install --frozen-lockfile --production=false

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY jest.config.ts ./
COPY prettierrc.json ./

# Build TypeScript application
RUN yarn build

# Production stage - multi-stage build for smaller image
FROM node:18-alpine AS production

# Install PM2 globally for production process management
RUN npm install -g pm2

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

# Copy built application from build stage
COPY --from=base /app/dist ./dist/
COPY --from=base /app/src/static ./src/static/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (matching your Cloud Run deployment configuration)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application using PM2 (as defined in your package.json start script)
CMD ["yarn", "start"]
