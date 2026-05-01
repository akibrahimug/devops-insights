/**
 * DevopsInsightsServer  —  class bootstrap
 * - Uses Mongo change streams when available.
 * - Falls back to poller-direct emits when change streams are unavailable.
 * - Supports WebSocket for real-time data updates.
 * - Supports WebSocket for historical data retrieval.
 * - Supports WebSocket for initial data retrieval.
 */

import http, { Server as HttpServer } from 'http';
import express, { Application, json, urlencoded } from 'express';
import compression from 'compression';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient as createRedisClient } from 'redis';
import mongoose from 'mongoose';
import { wireMetricChangeStream } from '@root/services/change-streams';
import { apiPoller } from '@root/services/api-poller';
import { metricsCache } from '@root/services/metrics-cache';
import applicationRoutes from '@root/routes';
import { config } from '@root/config';
import type { ChangeStream } from 'mongodb';
import apiRegions from '@root/static/api-regions.json';

const ALLOWED_SOURCES = apiRegions.allowed_sources as readonly string[];
type Source = (typeof ALLOWED_SOURCES)[number];

export class DevopsInsightsServer {
  private app: Application;
  private server!: HttpServer;
  private io!: SocketIOServer;
  private metricCS?: ChangeStream;
  private started = false;

  private readonly port = Number(config.PORT || 5000);
  private readonly mongoUrl = config.DATABASE_URL!;
  private readonly apiName = (config.EXTERNAL_API_NAME || '').toLowerCase();

  constructor(app?: Application) {
    this.app = app ?? express();
  }

  /* ---------- public ---------- */

  public async start() {
    if (this.started) return;
    await this.connectMongo();
    await this.createHttpAndSockets();
    this.configureMiddleware();
    this.configureSocketRooms();

    if (await this.changeStreamsAvailable()) {
      this.metricCS = wireMetricChangeStream(this.io, this.apiName);
    } else {
      console.warn('Change streams unavailable → using direct poller emits');
      apiPoller.setSocketIO(this.io);
      apiPoller.enableDirectEmit();
    }

    // Kick off polling and gate `listen()` on the in-memory cache being warm.
    // Race against an 8s timeout so we never block startup forever if Atlas
    // is mid-wake — clients hitting an unwarmed cache will get a retryable
    // metrics:error and the client retries with backoff.
    const pollerStarted = apiPoller.startPolling();
    await Promise.race([
      Promise.all([pollerStarted, metricsCache.whenReady()]),
      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
    ]);
    if (metricsCache.isReady()) {
      console.log('Metrics cache ready — accepting connections');
    } else {
      console.warn(
        'Metrics cache not ready after 8s — listening anyway, clients will retry',
      );
    }

    applicationRoutes(this.app);
    await this.listen();
    this.installSignals();
    this.started = true;
  }

  public async stop() {
    if (!this.started) return;
    this.started = false;
    try {
      await this.metricCS?.close();
    } catch (err) {
      console.error('Error closing change stream:', err);
    }
    apiPoller.stopPolling();
    await new Promise<void>((r) => this.io?.close(() => r()));
    await new Promise<void>((r) => this.server?.close(() => r()));
    await mongoose.disconnect();
  }

  /* ---------- internals ---------- */

  private async connectMongo() {
    mongoose.set('strictQuery', false);
    // Auto-reconnect: if the connection drops mid-flight (e.g. Atlas idle
    // disconnect), mongoose retries by default but the listener gives us a log
    // anchor and lets us re-issue connect() if the driver gives up.
    mongoose.connection.on('disconnected', () => {
      console.warn('Mongo disconnected — attempting reconnect');
      mongoose.connect(this.mongoUrl).catch((err) => {
        console.error('Mongo reconnect failed:', err?.message ?? err);
      });
    });
    await mongoose.connect(this.mongoUrl);
  }

  private async changeStreamsAvailable(): Promise<boolean> {
    const db = mongoose.connection.db;
    if (!db) return false;

    // 1.5s timeout — the replSetGetStatus admin command can hang while Atlas
    // is mid-wake on a cold start. We'd rather fall back to directEmit than
    // block startup.
    try {
      await Promise.race([
        db.admin().command({ replSetGetStatus: 1 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('replSetGetStatus timeout')), 1500),
        ),
      ]);
      return true; // replica set → change streams OK
    } catch {
      return false; // standalone or timeout → fallback to directEmit
    }
  }

  private async createHttpAndSockets() {
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    // Wire Socket.IO Redis adapter when REDIS_HOST is provided
    try {
      if (config.REDIS_HOST) {
        const pubClient = createRedisClient({ url: config.REDIS_HOST });
        const subClient = pubClient.duplicate();
        await pubClient.connect();
        await subClient.connect();
        this.io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.IO Redis adapter enabled');
      } else {
        console.log(
          'REDIS_HOST not set → single-instance mode (no Socket.IO adapter, no leader election)',
        );
      }
    } catch (err) {
      console.warn('Failed to enable Socket.IO Redis adapter:', err);
    }
  }

  private configureMiddleware() {
    this.app.use(compression());
    this.app.use(json({ limit: '50mb' }));
    this.app.use(urlencoded({ extended: true, limit: '50mb' }));
  }

  private configureSocketRooms() {
    const room = (s: Source) => `metrics:${this.apiName}:${s}`;

    this.io.on('connection', (socket: Socket) => {
      // Existing subscription handlers
      socket.on('metrics:subscribe', ({ source }) => {
        const src = (source || '').toLowerCase() as Source;
        if (!ALLOWED_SOURCES.includes(src))
          return socket.emit('error', {
            message: 'Invalid source',
            allowed: ALLOWED_SOURCES,
          });
        socket.join(room(src));
      });

      socket.on('metrics:unsubscribe', ({ source }) => {
        const src = (source || '').toLowerCase() as Source;
        if (ALLOWED_SOURCES.includes(src)) socket.leave(room(src));
      });

      // Get initial data via WebSocket. Cache-first; falls back to Mongo only
      // if the cache hasn't been warmed yet (cold-start race window).
      socket.on('metrics:get', async ({ source }) => {
        try {
          if (source) {
            const src = (source || '').toLowerCase() as Source;
            if (!ALLOWED_SOURCES.includes(src)) {
              return socket.emit('metrics:error', {
                message: 'Invalid source',
                allowed: ALLOWED_SOURCES,
              });
            }

            const cached = metricsCache.get(src);
            if (cached) {
              return socket.emit('metrics:data', {
                api: this.apiName,
                source: src,
                data: cached.data,
                updatedAt: cached.updatedAt,
              });
            }

            const { MetricLatest } = await import(
              '@root/shared/services/db/models/Metric.models'
            );
            const doc = await MetricLatest.findOne({
              api: this.apiName,
              source: src,
            }).lean();
            if (!doc) {
              return socket.emit('metrics:error', {
                message: 'No data yet for this source',
                retryAfterMs: 2000,
              });
            }

            socket.emit('metrics:data', {
              api: this.apiName,
              source: src,
              data: doc.data,
              updatedAt: doc.updatedAt,
            });
          } else {
            // All sources — prefer the cache; only fall back to Mongo if cache
            // is completely empty.
            const snapshot = metricsCache.getAll();
            if (snapshot.count > 0) {
              return socket.emit('metrics:data', {
                api: this.apiName,
                data: snapshot.data,
                count: snapshot.count,
                updatedAtBySource: snapshot.updatedAtBySource,
              });
            }

            const { MetricLatest } = await import(
              '@root/shared/services/db/models/Metric.models'
            );
            const rows = await MetricLatest.find({ api: this.apiName }).lean();
            if (rows.length === 0) {
              return socket.emit('metrics:error', {
                message: 'No data yet',
                retryAfterMs: 2000,
              });
            }
            const out: Record<string, unknown> = {};
            const timestamps: Record<string, string> = {};
            rows.forEach((r: any) => {
              out[r.source] = r.data;
              timestamps[r.source] = r.updatedAt;
            });

            socket.emit('metrics:data', {
              api: this.apiName,
              data: out,
              count: rows.length,
              updatedAtBySource: timestamps,
            });
          }
        } catch (error) {
          socket.emit('metrics:error', {
            message: 'Failed to fetch metrics',
            retryAfterMs: 2000,
          });
        }
      });

      // Get historical data via WebSocket
      socket.on('metrics:getHistory', async (params) => {
        try {
          console.log('Received history request:', params);

          const { MetricHistory } = await import(
            '@root/shared/services/db/models/Metric.models'
          );

          // Get the source, from, to, and limit from the params
          const { source, from, to, limit = 100 } = params || {};

          // Build query
          const query: any = { api: this.apiName };

          // Add source filter if specified
          if (source) {
            // Convert the source to lowercase and check if it's in the allowed sources
            const src = (source || '').toLowerCase() as Source;
            if (!ALLOWED_SOURCES.includes(src)) {
              return socket.emit('metrics:error', {
                message: 'Invalid source',
                allowed: ALLOWED_SOURCES,
              });
            }
            query.source = src;
          }

          // Add time range filter if specified
          if (from || to) {
            query.createdAt = {};
            if (from) query.createdAt.$gte = new Date(from);
            if (to) query.createdAt.$lte = new Date(to);
          }

          console.log('History query:', query);

          // Execute query with limit and sort by newest first
          const items = await MetricHistory.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

          // Log the number of items found (for debugging purposes)
          console.log(`Found ${items.length} history items`);

          // Build timestamps map from the history items
          const timestamps: Record<string, string> = {};
          items.forEach((item: any) => {
            const latestForSource = timestamps[item.source];
            if (
              !latestForSource ||
              new Date(item.createdAt) > new Date(latestForSource)
            ) {
              timestamps[item.source] = item.createdAt;
            }
          });

          // Build the response
          const response = {
            api: this.apiName,
            source: source || undefined,
            items: items.map((item: any) => ({
              api: item.api,
              source: item.source,
              data: item.data,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt, // Database timestamp when saved
            })),
            count: items.length,
          };

          // Log the response (for debugging purposes)
          console.log('Sending history response:', {
            api: response.api,
            source: response.source,
            count: response.count,
          });

          // Send the response to the client
          socket.emit('metrics:history', response);
        } catch (error) {
          // Log the error (for debugging purposes)
          console.error('Error fetching history:', error);
          socket.emit('metrics:error', { message: 'Failed to fetch history' });
        }
      });
    });
  }

  // Start the server
  private async listen() {
    await new Promise<void>((r) =>
      this.server.listen(this.port, () => {
        console.log(`Server listening on port ${this.port}`);
        r();
      }),
    );
  }

  // Graceful shutdown
  private installSignals() {
    // Handle SIGINT and SIGTERM signals to gracefully shutdown the server
    const shutdown = (sig: string) => {
      console.log(`Received ${sig}. Graceful shutdown…`);
      this.stop()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  }
}
