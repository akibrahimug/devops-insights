# DevOps Insights Dashboard

A real-time DevOps monitoring and analytics platform that provides comprehensive insights into system performance, deployment metrics, and operational data across multiple regions. This backend service powers live dashboards with instant data updates and seamless real-time communication.

## 🚀 Overview

The DevOps Insights Dashboard is built with a hybrid architecture that combines the reliability of HTTP endpoints with the power of real-time WebSocket communication. It serves as a centralized data engine for monitoring DevOps operations, providing instant updates and comprehensive system observability.

### Key Features

- **Real-time Data Streaming**: WebSocket-based live updates for instant dashboard synchronization
- **Multi-region Support**: Monitor metrics across 6 geographical regions (US East/West, EU West/Central, South America East, Asia-Pacific Southeast)
- **Hybrid Architecture**: Express.js for system endpoints + WebSockets for application logic
- **MongoDB Integration**: Robust data persistence with change stream monitoring
- **Redis Support**: Built-in caching and pub/sub messaging capabilities
- **TypeScript**: Full type safety and modern development experience
- **Comprehensive Testing**: Jest-based testing framework with coverage reporting
- **Production Ready**: PM2 process management and Docker containerization

## 🏗️ Architecture

### Core Components

- **Express.js Server**: Minimal HTTP endpoints for health checks, metrics, and system status
- **WebSocket Server**: Primary communication layer for real-time dashboard updates
- **MongoDB**: Document database for metric storage with change stream monitoring
- **Redis**: Caching layer and message broker for distributed operations
- **API Poller**: External API integration service with intelligent change detection

### Communication Strategy

1. **HTTP Endpoints** (System-level operations):
   - Health checks (`/api/v1/health`)
   - Metrics retrieval (`/api/v1/metrics`)
   - System information (`/api/v1/info`)

2. **WebSocket Events** (Application-level operations):
   - Real-time metric updates (`metrics-update`)
   - Region-specific subscriptions (`metrics:subscribe`)
   - Live data streaming with room-based broadcasting

## 🛠️ Technology Stack

### Backend Technologies

- **Node.js** with **TypeScript** for type-safe development
- **Express.js** for HTTP server and middleware
- **Socket.IO** for WebSocket communication
- **MongoDB** with Mongoose ODM for data persistence
- **Redis** for caching and pub/sub messaging
- **PM2** for production process management

### Development Tools

- **Jest** for unit testing and coverage
- **ESLint** + **Prettier** for code quality
- **Nodemon** for development hot-reloading
- **Bunyan** for structured logging
- **Docker Compose** for local development environment

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB 7+ (with replica set for change streams)
- Redis (optional, for caching features)
- Docker & Docker Compose (for containerized setup)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd devops-insights
   ```

2. **Install dependencies**

   ```bash
   cd server
   yarn install
   # or
   npm install
   ```

3. **Setup MongoDB with replica set**

   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d mongo

   # Initialize replica set
   docker exec -it mongo-rs mongosh --eval "rs.initiate()"
   ```

4. **Configure environment variables**

   ```bash
   # Create .env file
   cp .env.example .env

   # Edit with your configuration
   DATABASE_URL=mongodb://127.0.0.1:27017/devops-insights
   SERVER_PORT=5000
   NODE_ENV=development
   REDIS_HOST=redis://localhost:6379
   EXTERNAL_API_NAME=your-api-name
   CLIENT_URL=http://localhost:3000
   ```

5. **Start development server**
   ```bash
   yarn dev
   # or
   npm run dev
   ```

The server will start on `http://localhost:5000` with WebSocket support enabled.

## 🔧 Available Scripts

### Development

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build TypeScript to JavaScript
- `yarn start` - Start production server with PM2

### Code Quality

- `yarn lint:check` - Check code with ESLint
- `yarn lint:fix` - Fix ESLint issues automatically
- `yarn prettier:check` - Check code formatting
- `yarn prettier:fix` - Fix formatting issues

### Testing

- `yarn test` - Run all tests with coverage
- `yarn test:watch` - Run tests in watch mode

## 📊 API Documentation

### HTTP Endpoints

#### Health Check

```http
GET /api/v1/health
```

Returns server health status and uptime information.

#### Metrics Retrieval (WebSocket Only)

```http
GET /api/v1/metrics
GET /api/v1/metrics/us-east
```

⚠️ **These endpoints now return HTTP 426 (Upgrade Required)** and redirect to WebSocket usage.
All metrics data is now served exclusively via WebSocket for real-time performance.

#### System Information

```http
GET /api/v1/info
```

Returns system configuration and enabled features.

### WebSocket Events

#### Get Initial Metrics Data

```javascript
// Get all metrics
socket.emit("metrics:get", {});

// Get specific region
socket.emit("metrics:get", { source: "us-east" });

// Listen for response
socket.on("metrics:data", (data) => {
  console.log("Metrics data:", data);
  // { api, source?, data, updatedAt?, count? }
});

// Handle errors
socket.on("metrics:error", (error) => {
  console.error("Metrics error:", error);
});
```

#### Subscribe to Region Metrics

```javascript
socket.emit("metrics:subscribe", { source: "us-east" });
```

#### Unsubscribe from Region

```javascript
socket.emit("metrics:unsubscribe", { source: "us-east" });
```

#### Receive Real-time Updates

```javascript
socket.on("metrics-update", (data) => {
  console.log("New metrics:", data);
  // { api, source, data, timestamp }
});
```

## 🌍 Supported Regions

The platform monitors metrics across 6 geographical regions:

- **us-east** - US East Coast
- **us-west** - US West Coast
- **eu-west** - Europe West
- **eu-central** - Europe Central
- **sa-east** - South America East
- **ap-southeast** - Asia-Pacific Southeast

## 🗄️ Database Schema

### Metrics Latest Collection

Stores the most recent metrics for each API/region combination:

```typescript
{
  api: string; // API provider name
  source: string; // Region identifier
  data: object; // Raw metrics data
  hash: string; // SHA1 hash for change detection
  createdAt: Date;
  updatedAt: Date;
}
```

### Metrics History Collection

Maintains historical record of all metric changes:

```typescript
{
  api: string;
  source: string;
  data: object;
  hash: string;
  createdAt: Date;
}
```

## ⚡ Real-time Features

### Change Stream Monitoring

- MongoDB change streams automatically detect database modifications
- Instant WebSocket broadcasts to subscribed clients
- Region-specific room broadcasting for efficient data distribution

### API Polling Service

- Intelligent polling with SHA1 hash-based change detection
- Configurable polling intervals per region
- Automatic fallback when change streams are unavailable
- Error handling and retry logic for external API calls

### WebSocket Room Management

- Clients subscribe to region-specific rooms (`metrics:api-name:region`)
- Efficient data distribution only to interested subscribers
- Automatic connection cleanup and error handling

## 🔄 Data Flow

1. **API Polling**: External APIs polled at regular intervals
2. **Change Detection**: SHA1 hashing identifies data modifications
3. **Database Update**: Changed data stored in MongoDB collections
4. **Change Stream**: MongoDB detects and publishes change events
5. **WebSocket Broadcast**: Real-time updates sent to subscribed clients
6. **Client Update**: Dashboard receives and displays new data instantly

## 🐳 Docker Support

### Development Environment

```bash
# Start MongoDB with replica set
docker-compose up -d

# Initialize replica set (one-time setup)
docker exec -it mongo-rs mongosh --eval "rs.initiate()"
```

### Production Deployment

- Multi-stage Docker builds for optimized images
- PM2 process management for reliability
- Health check endpoints for container orchestration
- Environment-based configuration

## 🧪 Testing

### Test Structure

- **Unit Tests**: Individual component testing
- **Integration Tests**: Database and WebSocket integration
- **Coverage Reports**: Comprehensive test coverage tracking

### Running Tests

```bash
# Run all tests with coverage
yarn test

# Run specific test files
yarn test src/services/test/change-streams.test.ts

# Watch mode for development
yarn test --watch
```

## 📈 Performance & Scaling

### Current Capabilities

- Support for 1000+ concurrent WebSocket connections
- Sub-100ms latency for real-time updates
- Efficient MongoDB change stream processing
- Intelligent caching with Redis integration

### Scaling Considerations

- Horizontal WebSocket server scaling
- Database sharding for large datasets
- Redis cluster for distributed caching
- Load balancing for high availability

## 🔒 Security Features

- Input validation for all API endpoints
- CORS configuration for cross-origin requests
- Rate limiting for external API calls
- Structured error handling without data exposure
- Environment-based configuration management

## 🔍 Monitoring & Observability

### Logging

- Structured JSON logging with Bunyan
- Configurable log levels per environment
- Request correlation and tracing
- Error aggregation and reporting

### Health Checks

- Deep health checks for all dependencies
- MongoDB connection monitoring
- Redis connectivity verification
- External API availability status

## 🚀 Production Deployment

### Environment Configuration

```bash
NODE_ENV=production
DATABASE_URL=mongodb://your-production-db/devops-insights
REDIS_HOST=redis://your-redis-cluster
SERVER_PORT=5000
CLIENT_URL=https://your-dashboard-domain.com
```

### Process Management

```bash
# Start with PM2 (production)
yarn build
yarn start

# Monitor processes
pm2 logs
pm2 status
```

## 📋 Development Roadmap

### Current Implementation Status

- ✅ Core Express + WebSocket architecture
- ✅ MongoDB integration with change streams
- ✅ Real-time metric polling and broadcasting
- ✅ Multi-region support
- ✅ TypeScript type safety
- ✅ Basic testing framework

### Future Enhancements

- [ ] Complete Redis integration
- [ ] Advanced authentication/authorization
- [ ] Comprehensive monitoring dashboard
- [ ] Kubernetes deployment manifests
- [ ] Advanced analytics and reporting
- [ ] Data retention and archival strategies

## 🤝 Contributing

### Development Guidelines

1. Follow TypeScript best practices
2. Maintain test coverage above 80%
3. Use conventional commit messages
4. Update documentation for new features
5. Ensure all linting checks pass

### Code Style

- ESLint configuration enforces consistent style
- Prettier handles code formatting
- TypeScript strict mode enabled
- Comprehensive type definitions required

## 📖 Additional Documentation

- **[MANIFESTO.md](server/MANIFESTO.md)** - Detailed architecture philosophy and decisions
- **[SCALING.md](server/SCALING.md)** - Scaling strategies and improvement roadmap
- **API Documentation** - Comprehensive endpoint and WebSocket event documentation

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Kasoma Ibrahim** - Full-stack developer specializing in real-time web applications and DevOps solutions.

---

_Built with ❤️ for modern DevOps teams who need real-time insights into their infrastructure and deployments._
