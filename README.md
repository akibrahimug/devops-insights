# DevOps Insights Dashboard

A real-time DevOps monitoring platform that provides comprehensive insights into system performance and operational metrics across multiple geographical regions. Built with a modern hybrid architecture combining HTTP endpoints and WebSocket communication for optimal performance and real-time data streaming.

## What It Does

The DevOps Insights Dashboard serves as a centralized monitoring solution that:

- **Monitors Multi-Region Metrics**: Tracks system performance across 6 geographical regions (US East/West, EU West/Central, South America East, Asia-Pacific Southeast)
- **Provides Real-Time Updates**: Delivers instant metric updates through WebSocket connections for live dashboard synchronization
- **Aggregates External API Data**: Polls external DevOps APIs, detects changes, and broadcasts updates to connected clients
- **Offers System Observability**: Provides comprehensive health checks, system metrics, and operational insights

## Architecture

### High-Level Structure

```
devops-insights/
├── client/          # Frontend dashboard (future implementation)
└── server/          # Node.js backend with TypeScript
```

### Backend Architecture

The backend follows a **hybrid communication strategy**:

- **Express.js**: Minimal HTTP server for system endpoints (health checks, basic info)
- **WebSockets**: Primary communication layer for all dashboard data and real-time updates
- **MongoDB**: Document database with change stream monitoring for instant data propagation
- **Redis**: Caching layer and pub/sub messaging (optional, for enhanced performance)

### Key Components

#### Core Services

- **API Poller**: Intelligent polling service that monitors external APIs, detects changes using SHA1 hashing, and updates the database
- **Change Streams**: MongoDB change stream monitoring that automatically broadcasts database updates to WebSocket clients
- **WebSocket Server**: Real-time communication hub managing client connections and room-based subscriptions

#### Data Flow

1. **API Polling** → External APIs polled at configurable intervals
2. **Change Detection** → SHA1 hashing identifies data modifications
3. **Database Update** → Modified data stored in MongoDB (latest + history)
4. **Change Stream** → MongoDB change events trigger automatic notifications
5. **WebSocket Broadcast** → Real-time updates sent to subscribed dashboard clients

### Technology Stack

#### Backend

- **Node.js** with **TypeScript** for type-safe development
- **Express.js** for HTTP server and system endpoints
- **Socket.IO** for WebSocket communication and room management
- **MongoDB** with Mongoose ODM for data persistence
- **Redis** for caching and distributed messaging (optional)
- **PM2** for production process management

#### DevOps & Testing

- **Docker Compose** for local development environment
- **Jest** for comprehensive testing with coverage reporting
- **ESLint + Prettier** for code quality and formatting
- **Bunyan** for structured JSON logging

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7+ (with replica set support for change streams)
- Docker & Docker Compose (recommended)

### Setup

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd devops-insights/server
   npm install
   ```

2. **Start MongoDB with replica set**

   ```bash
   docker-compose up -d mongo
   docker exec -it mongo-rs mongosh --eval "rs.initiate()"
   ```

3. **Configure environment**

   ```bash
   # Create .env file with:
   DATABASE_URL=mongodb://127.0.0.1:27017/devops-insights
   PORT=5000
   NODE_ENV=development
   EXTERNAL_API_NAME=your-api-name
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The server starts on `http://localhost:5000` with WebSocket support at `/socket.io/`.

## API Usage

### HTTP Endpoints (System Only)

- `GET /api/v1/health` - Server health and uptime
- `GET /api/v1/info` - System configuration and features
- `GET /api/v1/metrics` - Returns WebSocket upgrade instructions

### WebSocket Events (Primary Communication)

```javascript
// Connect to WebSocket
const socket = io("http://localhost:5000");

// Get initial metrics data
socket.emit("metrics:get", { source: "us-east" }); // specific region
socket.emit("metrics:get", {}); // all regions

// Listen for data
socket.on("metrics:data", (data) => {
  console.log("Metrics:", data); // { api, source?, data, updatedAt?, count? }
});

// Subscribe to real-time updates
socket.emit("metrics:subscribe", { source: "us-east" });

// Receive live updates
socket.on("metrics-update", (update) => {
  console.log("Live update:", update); // { api, source, data, timestamp }
});
```

## Development

### Available Scripts

- `npm run dev` - Development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run test` - Run tests with coverage
- `npm run lint:fix` - Fix linting issues
- `npm run start` - Production server with PM2

### Testing

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
```

## Supported Regions

The platform monitors metrics across 6 geographical regions:

- **us-east** - US East Coast
- **us-west** - US West Coast
- **eu-west** - Europe West
- **eu-central** - Europe Central
- **sa-east** - South America East
- **ap-southeast** - Asia-Pacific Southeast

## Production Deployment

The application is production-ready with:

- PM2 process management for reliability
- Docker containerization support
- Comprehensive health monitoring
- Structured logging with correlation IDs
- Graceful shutdown handling
- Environment-based configuration

## License

ISC License

---

_A modern DevOps monitoring solution built for real-time insights and operational excellence._
