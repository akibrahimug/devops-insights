/**
 * DevopsInsightsServer  —  class bootstrap
 * - Uses Mongo change streams when available.
 * - Falls back to poller-direct emits when change streams are unavailable.
 */

import http, { Server as HttpServer } from 'http';
import express, { Application, json, urlencoded } from 'express';
import compression from 'compression';
import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { wireMetricChangeStream } from '@root/services/change-streams';
import { apiPoller } from '@root/services/api-poller';
import applicationRoutes from '@root/routes';
import { config } from '@root/config';
import type { ChangeStream } from 'mongodb';

const ALLOWED_SOURCES = [
  'us-east',
  'eu-west',
  'eu-central',
  'us-west',
  'sa-east',
  'ap-southeast',
] as const;
type Source = (typeof ALLOWED_SOURCES)[number];

export class DevopsInsightsServer {
  private app: Application;
  private server!: HttpServer;
  private io!: SocketIOServer;
  private metricCS?: ChangeStream;
  private started = false;

  private readonly port = Number(config.SERVER_PORT || 5000);
  private readonly mongoUrl = config.DATABASE_URL!;
  private readonly apiName = (
    config.EXTERNAL_API_NAME || 'upscope'
  ).toLowerCase();

  constructor(app?: Application) {
    this.app = app ?? express();
  }

  /* ---------- public ---------- */

  public async start() {
    if (this.started) return;
    await this.connectMongo();
    this.createHttpAndSockets();
    this.configureMiddleware();
    this.configureSocketRooms();

    if (await this.changeStreamsAvailable()) {
      this.metricCS = wireMetricChangeStream(this.io, this.apiName);
    } else {
      console.warn('Change streams unavailable → using direct poller emits');
      apiPoller.setSocketIO(this.io);
      apiPoller.enableDirectEmit();
    }

    await apiPoller.startPolling();
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
    } catch {}
    apiPoller.stopPolling();
    await new Promise<void>((r) => this.io?.close(() => r()));
    await new Promise<void>((r) => this.server?.close(() => r()));
    await mongoose.disconnect();
  }

  /* ---------- internals ---------- */

  private async connectMongo() {
    await mongoose.connect(this.mongoUrl);
  }

  private async changeStreamsAvailable(): Promise<boolean> {
    const db = mongoose.connection.db;
    if (!db) return false;

    try {
      await db.admin().command({ replSetGetStatus: 1 });
      return true; // replica set → change streams OK
    } catch {
      return false; // standalone → fallback to directEmit
    }
  }

  private createHttpAndSockets() {
    this.server = http.createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
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

      // NEW: Get initial data via WebSocket
      socket.on('metrics:get', async ({ source }) => {
        try {
          const { MetricLatest } = await import(
            '@root/shared/services/db/models/Metric.models'
          );

          if (source) {
            const src = (source || '').toLowerCase() as Source;
            if (!ALLOWED_SOURCES.includes(src)) {
              return socket.emit('metrics:error', {
                message: 'Invalid source',
                allowed: ALLOWED_SOURCES,
              });
            }

            const doc = await MetricLatest.findOne({
              api: this.apiName,
              source: src,
            }).lean();
            if (!doc) {
              return socket.emit('metrics:error', {
                message: 'No data yet for this source',
              });
            }

            socket.emit('metrics:data', {
              api: this.apiName,
              source: src,
              data: doc.data,
              updatedAt: doc.updatedAt,
            });
          } else {
            // Get all sources
            const rows = await MetricLatest.find({ api: this.apiName }).lean();
            const out: Record<string, unknown> = {};
            rows.forEach((r: any) => {
              out[r.source] = r.data;
            });

            socket.emit('metrics:data', {
              api: this.apiName,
              data: out,
              count: rows.length,
            });
          }
        } catch (error) {
          socket.emit('metrics:error', { message: 'Failed to fetch metrics' });
        }
      });
    });
  }

  private async listen() {
    await new Promise<void>((r) =>
      this.server.listen(this.port, () => {
        console.log(`Server listening on port ${this.port}`);
        r();
      }),
    );
  }

  private installSignals() {
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
