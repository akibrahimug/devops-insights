/**
 * EXTERNAL API POLLING SERVICE  (Mongo → WS, auto-fallback)
 *
 * - Polls every region, hashes payload, writes to Mongo if it changed.
 * - When `directEmit` is true, emits to WebSocket room right here.
 *   Otherwise, a MongoDB change-stream module will broadcast.
 */

import axios from 'axios';
import crypto from 'node:crypto';
import { Server as SocketIOServer } from 'socket.io';
import { MetricLatest, MetricHistory } from '@root/models/Metric.models';
import Logger from 'bunyan';
import { config } from '@root/config';

const log: Logger = config.createLogger('api-poller');

const SOURCES = [
  'us-east',
  'eu-west',
  'eu-central',
  'us-west',
  'sa-east',
  'ap-southeast',
] as const;
type Source = (typeof SOURCES)[number];

interface ExternalApi {
  name: string; // provider
  source: Source; // region
  url: string;
  interval: number; // ms
}

export class ApiPollerService {
  private io: SocketIOServer | null = null;
  private intervals = new Map<string, NodeJS.Timeout>();
  private apiName = (process.env.EXTERNAL_API_NAME || 'upscope').toLowerCase();

  /** When true, poller emits directly instead of relying on change streams */
  private directEmit = false;
  public enableDirectEmit() {
    this.directEmit = true;
  }

  private apis: ExternalApi[] = SOURCES.map((source) => ({
    name: this.apiName,
    source,
    url: `https://data--${source}.${this.apiName}.io/status?stats=1`,
    interval: 30_000,
  }));

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  /* ---------- start / stop ---------- */

  public async startPolling() {
    if (this.intervals.size) this.stopPolling(); // idempotent
    this.apis.forEach((api) => {
      const key = `${api.name}:${api.source}`;
      void this.pollOnce(api); // kick-off
      this.intervals.set(
        key,
        setInterval(() => void this.pollOnce(api), api.interval),
      );
    });
    log.info(`Polling ${this.intervals.size} API targets`);
  }

  public stopPolling() {
    this.intervals.forEach(clearInterval);
    this.intervals.clear();
  }

  /* ---------- core polling ---------- */

  private async pollOnce(api: ExternalApi) {
    try {
      const res = await axios.get(api.url, { timeout: 5_000 });
      const json = JSON.stringify(res.data);
      const hash = crypto.createHash('sha1').update(json).digest('hex');

      const existing = await MetricLatest.findOne({
        api: api.name,
        source: api.source,
      })
        .select('hash')
        .lean();

      if (existing?.hash === hash) return; // no change

      // upsert latest & append history
      await MetricLatest.updateOne(
        { api: api.name, source: api.source },
        { $set: { data: res.data, hash } },
        { upsert: true },
      );
      await MetricHistory.create({
        api: api.name,
        source: api.source,
        data: res.data,
        hash,
      });

      log.info(`${api.name}/${api.source} changed (db updated)`);

      /* ---------- optional direct emit ---------- */
      if (this.directEmit && this.io) {
        this.io.to(`metrics:${api.name}:${api.source}`).emit('metrics-update', {
          api: api.name,
          source: api.source,
          data: res.data,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      log.error(
        {
          api: `${api.name}/${api.source}`,
          message: err?.message,
          status: err?.response?.status,
          code: err?.code,
        },
        'Failed to poll',
      );
    }
  }
}

export const apiPoller = new ApiPollerService();
