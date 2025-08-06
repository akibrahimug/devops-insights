/**
 * SIMPLE EXPRESS + WEBSOCKET SERVER FOR EXTERNAL API CONSUMPTION
 *
 * Minimal Express server with WebSocket support for real-time updates.
 * Designed to consume external APIs and broadcast changes to dashboard clients.
 *
 * Key Features:
 * - Express: Health checks and cached data endpoints
 * - WebSocket: Real-time broadcasting of external API changes
 * - Redis: Caching and pub/sub for multi-instance support
 */
import {
  Application,
  json,
  urlencoded,
  Response,
  Request,
  NextFunction,
} from 'express';
import cors from 'cors';
import { config } from '@root/config';
import Logger from 'bunyan';
import http from 'http';
import HTTP_STATUS from 'http-status-codes';
import apiStates from 'swagger-stats';
import compression from 'compression';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import applicationRoutes from '@root/routes';
import { apiPoller } from '@root/services/api-poller';

// use this port number for development
//and we will use it in AWS for load balancing and security groups
const SERVER_PORT = process.env.PORT || 5000;
const log: Logger = config.createLogger('server');
export class DevopsInsightsServer {
  // express instance
  private app: Application;
  //   use the express instance to create the app
  constructor(app: Application) {
    this.app = app;
  }

  public start(): void {
    this.standardMiddleware(this.app);
    this.routesMiddleware(this.app);
    this.apiMonitoring(this.app);
    this.startServer(this.app);
  }

  // moniter the api using swagger-stats in the browser
  private apiMonitoring(app: Application): void {
    app.use(
      apiStates.getMiddleware({
        uriPath: '/api-monitoring',
      }),
    );
  }

  // manage all the routes
  private routesMiddleware(app: Application): void {
    applicationRoutes(app);
  }

  //   catch all errors

  private async startServer(app: Application): Promise<void> {
    try {
      const httpServer: http.Server = new http.Server(app);
      const socketIO: Server = await this.createSocketIO(httpServer);
      this.startHttpServer(httpServer);
      this.socketIOCOnnections(socketIO);

      // Link WebSocket server to API poller for real-time updates
      // log the socket io
      log.info('Socket IO created and connected to the api poller...');
      apiPoller.setSocketIO(socketIO);
    } catch (e) {
      log.error(e);
    }
  }

  //   standard middleware
  private standardMiddleware(app: Application): void {
    app.use(compression());
    app.use(
      json({
        limit: '50mb',
      }),
    );
    app.use(
      urlencoded({
        extended: true,
        limit: '50mb',
      }),
    );
  }

  //   create socket io
  private async createSocketIO(httpServer: http.Server): Promise<Server> {
    const io: Server = new Server(httpServer, {
      cors: {
        origin: config.CLIENT_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      },
    });
    const pubClient = createClient({ url: config.REDIS_HOST });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    return io;
  }

  //   start the http server
  private startHttpServer(httpServer: http.Server): void {
    log.info(`Worker has started with id of ${process.pid}`);
    log.info(`Server has started with process ${process.pid}`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Server started on port ${SERVER_PORT}`);

      // Start polling external APIs
      apiPoller.startPolling();
      log.info('External API polling started');
    });
  }

  private socketIOCOnnections(io: Server): void {
    log.info('WebSocket server started, waiting for connections...');

    // We shall add the socket io connections here that we describe in the shared/sockets
  }
}
