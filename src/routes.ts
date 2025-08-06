/**
 * API ROUTES AND WEBSOCKET MESSAGE HANDLERS CONFIGURATION
 *
 * This file serves as the central hub for both minimal HTTP API routes and comprehensive
 * WebSocket message handlers for the DevOps Insights Dashboard backend. It organizes
 * a few essential REST API endpoints for system monitoring alongside comprehensive
 * WebSocket message handlers for all main application communication.
 *
 * Key Responsibilities:
 * - Import and organize minimal HTTP route modules (health checks, metrics, status only)
 * - Import and organize comprehensive WebSocket message handler modules
 * - Register minimal HTTP routes with Express (system endpoints only, no main app data)
 * - Register comprehensive WebSocket message handlers for all dashboard functionality
 * - Apply middleware to both minimal HTTP routes and comprehensive WebSocket messages
 * - Configure basic API structure for system endpoints
 * - Set up comprehensive real-time event broadcasting for WebSocket clients
 * - Define message schemas and validation for both minimal HTTP and comprehensive WebSocket
 * - Apply consistent response/message formatting across all endpoints
 *
 * Minimal HTTP Route Categories (Express - System Only):
 * - Health check routes (/api/health, /api/status) - Server health monitoring
 * - Metrics routes (/api/metrics) - System performance metrics
 * - Basic status endpoints (/api/version, /api/info) - Server information
 *
 * Comprehensive WebSocket Message Categories (Primary Communication):
 * - Real-time DevOps metrics (deployment status, performance data, alerts)
 * - Live dashboard updates (charts, notifications, real-time data streams)
 * - User interaction messages (dashboard actions, commands, preferences)
 * - System monitoring streams (logs, health metrics, real-time system data)
 * - Data queries and responses (all dashboard data requests and responses)
 * - Simple connection management (no authentication required)
 *
 * Architecture Note: Express handles ONLY minimal system monitoring endpoints
 * that don't pass through main WebSocket connections. ALL main application
 * communication (data, user interactions) goes through WebSockets.
 * No authentication is implemented to maintain simplicity and focus on core functionality.
 */

// TODO: Implement minimal HTTP routes and comprehensive WebSocket handlers
// - Import minimal HTTP route modules (health/metrics only) and comprehensive WebSocket handlers
// - Register minimal HTTP routes with Express app (system monitoring only)
// - Register comprehensive WebSocket handlers for all main application communication
// - Apply appropriate middleware to each communication type
// - Set up comprehensive real-time broadcasting and subscription management
// - Export routing configuration separating minimal HTTP from primary WebSocket communication
