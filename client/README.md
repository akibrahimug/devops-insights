# DevOps Insights Dashboard - Frontend

A modern, real-time dashboard built with Next.js 15 and TypeScript that connects to the DevOps Insights backend via WebSockets for live monitoring of global infrastructure metrics.

## 🚀 Features

- **Real-time WebSocket Connection** - Live updates from backend metrics
- **Global Region Monitoring** - Track metrics across multiple geographical regions
- **Interactive Dashboard** - Modern UI with charts and real-time data visualization
- **Responsive Design** - Works seamlessly on desktop and mobile devices
- **Connection Management** - Automatic reconnection and error handling
- **TypeScript** - Full type safety and excellent developer experience

## 🏗️ Architecture

### WebSocket Communication

- **Socket.IO Client** - Handles real-time communication with backend
- **Context Provider** - Global state management for WebSocket connection
- **Automatic Reconnection** - Resilient connection handling with exponential backoff
- **Room Subscriptions** - Subscribe to specific region metrics

### Components Structure

```
app/
├── components/
│   ├── DevOpsDashboard.tsx     # Main dashboard component
│   ├── ConnectionStatus.tsx    # WebSocket connection indicator
│   ├── RegionSelector.tsx      # Region selection interface
│   └── MetricsCard.tsx        # Individual region metrics display
├── contexts/
│   └── WebSocketContext.tsx   # WebSocket state management
└── globals.css                # Global styles with Tailwind CSS
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js 18.18.0 or higher
- npm or yarn

### Install Dependencies

```bash
npm install
# or
yarn install
```

### Environment Configuration

Create a `.env.local` file:

```bash
NEXT_PUBLIC_BACKEND_URL=https://devops-insights-55775885281.europe-west2.run.app
```

### Development Server

```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📡 WebSocket Events

### Outgoing Events (Client → Server)

- `metrics:subscribe` - Subscribe to a specific region's metrics
- `metrics:unsubscribe` - Unsubscribe from a region
- `metrics:get` - Request initial data for region(s)

### Incoming Events (Server → Client)

- `metrics:data` - Receive metrics data (initial or requested)
- `metrics:error` - Error messages from server
- `metrics-update` - Real-time metric updates

### Example Usage

```typescript
// Subscribe to US East region
socket.emit("metrics:subscribe", { source: "us-east" });

// Listen for real-time updates
socket.on("metrics-update", (data) => {
  console.log("New metrics:", data);
});

// Get initial data for all regions
socket.emit("metrics:get", {});
```

## 🎨 UI Components

### DevOpsDashboard

Main dashboard component that orchestrates all other components and manages the overall application state.

### ConnectionStatus

Displays the current WebSocket connection status with visual indicators:

- 🟢 Connected
- 🟡 Connecting
- 🔴 Connection Error

### RegionSelector

Interactive region selection interface allowing users to:

- Toggle region monitoring on/off
- Enable/disable auto-refresh
- View region flags and names

### MetricsCard

Individual region metric displays featuring:

- Real-time charts using Recharts
- Key performance indicators
- Expandable detailed metrics
- Health status indicators

## 🌍 Supported Regions

- **US East** (us-east) 🇺🇸
- **US West** (us-west) 🇺🇸
- **EU West** (eu-west) 🇪🇺
- **EU Central** (eu-central) 🇪🇺
- **Asia Pacific** (ap-southeast) 🌏
- **South America** (sa-east) 🇧🇷

## 📊 Metrics Displayed

Each region card shows:

- **Response Time** - Average API response time in milliseconds
- **Error Rate** - Percentage of failed requests
- **Request Count** - Total number of requests processed
- **Uptime** - Service availability percentage
- **Interactive Charts** - Visual representation of key metrics
- **Real-time Updates** - Live data streaming via WebSockets

## 🔒 Security Considerations

**Current State**: The backend WebSocket endpoint is publicly accessible for demonstration purposes.

**Production Recommendations**:

- Implement authentication tokens for WebSocket connections
- Add origin validation to restrict client domains
- Use HTTPS/WSS for encrypted communication
- Implement rate limiting on client connections
- Add input validation for all WebSocket messages

See `server/SCALING.md` for detailed security implementation guidelines.

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Vercel Deployment

The application is optimized for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com`
3. Deploy automatically on push to main branch

### Environment Variables

- `NEXT_PUBLIC_BACKEND_URL` - Backend WebSocket server URL
- `NODE_ENV` - Environment (development/production)

## 🧪 Development

### Code Quality

- **ESLint** - Code linting with Next.js configuration
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Prettier** - Code formatting (recommended)

### Performance

- **Next.js 15** - Latest Next.js with App Router
- **WebSocket Optimization** - Efficient connection management
- **Component Optimization** - React best practices
- **Bundle Optimization** - Tree shaking and code splitting

## 📈 Monitoring & Analytics

The dashboard includes built-in monitoring for:

- WebSocket connection health
- Real-time metric updates
- Error tracking and display
- Connection latency indicators

## 🤝 Contributing

1. Follow TypeScript strict mode guidelines
2. Use React hooks and functional components
3. Implement proper error boundaries
4. Add loading states for better UX
5. Test WebSocket connection scenarios

## 📝 License

This project is part of the DevOps Insights monitoring solution.

---

**Built with ❤️ using Next.js, TypeScript, and Socket.IO**
