/**
 * MAIN APPLICATION ENTRY POINT
 *
 * This is the primary entry point for the DevOps Insights Dashboard backend application.
 * It coordinates the initialization of all major application components including the
 * Express server (for minimal system endpoints) with integrated WebSocket capabilities
 * (for all main application communication), database connections, and both minimal HTTP
 * routes and comprehensive real-time communication handlers.
 *
 * Key Responsibilities:
 * - Initialize Express application for minimal HTTP endpoints (health, metrics, status only)
 * - Initialize WebSocket server for all main dashboard communication and data exchange
 * - Set up minimal HTTP middleware for system endpoints only
 * - Establish database connections (MongoDB and Redis)
 * - Register minimal HTTP API routes (health checks, metrics, system status only)
 * - Configure comprehensive WebSocket handlers for all dashboard functionality
 * - Start the Express server with WebSocket capabilities
 * - Handle graceful shutdown procedures for both HTTP and WebSocket connections
 * - Configure environment-specific settings
 *
 * Architecture Note: Express handles ONLY minimal system requests (health checks, metrics,
 * basic status) while WebSockets handle ALL main application communication including
 * dashboard data, user interactions, and real-time updates. No authentication is
 * implemented to maintain simplicity and focus on core DevOps functionality.
 *
 * This file serves as the orchestrator that brings together all the individual
 * components (minimal Express setup, database setup, system HTTP routes, comprehensive
 * WebSocket handlers) to create a backend service where WebSockets are the primary
 * communication method and Express provides essential system monitoring endpoints.
 */

import express, { Express } from 'express';
import { DevopsInsightsServer } from '@root/setupServer';
import databaseConnection from '@root/setupDatabase';
import { config } from '@root/config';
import Logger from 'bunyan';

const log: Logger = config.createLogger('app');
class Application {
  public initialize(): void {
    this.loadConfig();
    //  connect to the database before starting the server
    databaseConnection();
    const app: Express = express();
    const server: DevopsInsightsServer = new DevopsInsightsServer(app);
    server.start();
  }

  private loadConfig(): void {
    //  load the configuration
    config.validate();
  }

  // handle all process errors
  private static handleExit(): void {
    process.on('uncaughtException', (error: Error) => {
      log.error(`There was an uncaught error: ${error}`);
      Application.shutDownProperly(1);
    });

    process.on('unhandleRejection', (reason: Error) => {
      log.error(`Unhandled rejsection at promise: ${reason}`);
      Application.shutDownProperly(2);
    });

    process.on('SIGTERM', () => {
      log.error('Caught a ***SIGTERM***(signal to terminate a process)');
      Application.shutDownProperly(2);
    });
  }

  private static shutDownProperly(exitCode: number): void {
    Promise.resolve()
      .then(() => {
        log.info('Shutdown complete');
        process.exit(exitCode);
      })
      .catch((error) => {
        log.error(`Error during shutdown: ${error}`);
        process.exit(1);
      });
  }
}

const application: Application = new Application();
application.initialize();
