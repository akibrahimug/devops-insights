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
├── client/          # Next.js 16 + React 19 dashboard (Vercel)
└── server/          # Node.js + TypeScript backend (Cloud Run)
```

### Backend Architecture

The backend follows a **hybrid communication strategy**:

- **Express.js**: Minimal HTTP server for system endpoints (health checks, basic info)
- **WebSockets**: Primary communication layer for all dashboard data and real-time updates
- **MongoDB**: Document database with change stream monitoring for instant data propagation
- **Redis**: Caching layer and pub/sub messaging (optional, for enhanced performance)

### Key Components

#### Core Services

- **API Poller**: Polls each region every 30s, hashes the payload, and writes changes to Mongo. Populates an in-memory cache *before* the DB write so first-paint never depends on Mongo being awake.
- **Metrics Cache**: Process-local snapshot per region. Backs the `metrics:get` socket handler so initial requests return in microseconds, not after a Mongo round-trip. The HTTP server only begins listening once the cache is warm (with an 8s safety timeout).
- **Change Streams**: MongoDB change stream monitoring that broadcasts database updates to WebSocket clients. Falls back to direct poller emits if change streams are unavailable.
- **WebSocket Server**: Real-time communication hub managing client connections and per-region room subscriptions. Retryable error responses include a `retryAfterMs` hint so the client can back off cleanly during cold start.

#### Data Flow

1. **API Polling** → Each region polled every 30s
2. **Cache First** → In-memory cache updated before any DB I/O, so the dashboard renders even if Atlas is asleep
3. **Change Detection** → SHA1 hashing identifies data modifications
4. **Database Update** → Modified data persisted to MongoDB (latest + 7-day history TTL); failures swallowed so polling continues
5. **Change Stream / Direct Emit** → MongoDB change events (or direct emit fallback) trigger room broadcasts
6. **WebSocket Broadcast** → Real-time updates sent to subscribed dashboard clients

### Technology Stack

#### Backend

- **Node.js 20** + **TypeScript** for type-safe development
- **Express.js** for HTTP server and system endpoints
- **Socket.IO** for WebSocket communication and room management
- **MongoDB** with Mongoose ODM for data persistence
- **Redis** for cross-instance leader election and Socket.IO adapter (optional — single-instance Cloud Run runs without it)

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
- `npm run start` - Production server (`node dist/app.js`)

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

- Docker container deployed to **Google Cloud Run** (free tier; `--min-instances=0`, `--cpu-boost`, `--memory=512Mi`)
- Auto-deploy via GitHub Actions on push to `master` (`.github/workflows/deployment.yml`)
- Comprehensive health monitoring (`/api/v1/health` also pings Mongo so a Cloud Scheduler keep-warm cron can wake Atlas M0)
- Structured JSON logging via Bunyan
- Graceful shutdown on SIGINT/SIGTERM
- Environment-based configuration

### Cold-start performance

The dashboard is engineered to render quickly even on a cold Cloud Run revision with a sleeping Mongo Atlas M0 cluster. Time-to-first-paint targets:

| Scenario | Target |
|---|---|
| Container warm, Atlas warm | 1–2s |
| Container cold, Atlas warm | 4–7s |
| Container cold, Atlas asleep (worst case) | 8–15s |
| With keep-warm cron (Atlas always warm) | 4–7s consistently |

See [`MIGRATION.md`](MIGRATION.md) for the architecture decisions, the keep-warm cron setup, and verification steps.

## License

ISC License

---

_A modern DevOps monitoring solution built for real-time insights and operational excellence._
