/**
 * EXTERNAL API POLLING SERVICE  (Mongo → WS, auto-fallback)
 *
 * - Polls every region, hashes payload, writes to Mongo if it changed.
 * - When `directEmit` is true, emits to WebSocket room right here.
 *   Otherwise, a MongoDB change-stream module will broadcast.
 * - This service is used to poll the external api and store the data in the database.
 * - This service is used to emit the data to the websocket.
 */

import axios from 'axios';
import crypto from 'node:crypto';
import { Server as SocketIOServer } from 'socket.io';
import {
  MetricLatest,
  MetricHistory,
} from '@root/shared/services/db/models/Metric.models';
import Logger from 'bunyan';
import { config } from '@root/config';
import apiRegions from '@root/static/api-regions.json';
import { RedisLeaderLock } from '@services/redis/leader.lock';

const log: Logger = config.createLogger('api-poller');

const SOURCES = apiRegions.allowed_sources as Array<string>;
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
  private apiName = (process.env.EXTERNAL_API_NAME || '').toLowerCase();
  private leader?: RedisLeaderLock;
  private cancelRetry?: () => void;

  /** When true, poller emits directly instead of relying on change streams */
  private directEmit = false;
  public enableDirectEmit() {
    this.directEmit = true;
  }
  private beginIntervals() {
    // poll the api
    this.apis.forEach((api) => {
      const key = `${api.name}:${api.source}`;
      // initial immediate poll
      void this.pollOnce(api);
      // set periodic interval
      this.intervals.set(
        key,
        setInterval(() => void this.pollOnce(api), api.interval),
      );
    });
    log.info(`Polling ${this.intervals.size} API targets`);
  }

  // map the sources to the api name and url
  private apis: ExternalApi[] = SOURCES.map((source) => ({
    name: this.apiName,
    source,
    url: `https://data--${source}.${this.apiName}.io/status?stats=1`,
    interval: 30_000,
  }));

  // set the socket io
  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  /* ---------- start / stop ---------- */

  // start polling the api
  public async startPolling() {
    // stop polling if the intervals are not empty
    if (this.intervals.size) this.stopPolling(); // idempotent
    // If Redis is configured, attempt to become leader before polling
    if (config.REDIS_HOST) {
      this.leader = new RedisLeaderLock({
        key: `devops-insights:poller:leader:${this.apiName}`,
        ttlMs: 30000,
      });
      this.cancelRetry = this.leader.startRetryAcquire(async () => {
        // On becoming leader, start intervals
        this.beginIntervals();
      });
      log.info('Attempting leader election via Redis for API poller');
      return; // do not start intervals until leader
    }
    // No Redis → single instance mode
    this.beginIntervals();
  }

  public stopPolling() {
    if (this.cancelRetry) this.cancelRetry();
    this.cancelRetry = undefined;
    this.intervals.forEach(clearInterval);
    this.intervals.clear();
    void this.leader?.release().catch(() => {});
    this.leader = undefined;
  }

  /* ---------- core polling ---------- */

  private async pollOnce(api: ExternalApi) {
    try {
      const res = await axios.get(api.url, { timeout: 5_000 });
      const json = JSON.stringify(res.data);
      // hash the data
      const hash = crypto.createHash('sha1').update(json).digest('hex');

      // check if the data has changed
      const existing = await MetricLatest.findOne({
        api: api.name,
        source: api.source,
      })
        .select('hash')
        .lean();
      // if the data has not changed, return
      if (existing?.hash === hash) return; // no change

      // upsert latest & append history
      await MetricLatest.updateOne(
        { api: api.name, source: api.source },
        { $set: { data: res.data, hash } },
        { upsert: true },
      );
      // append history
      await MetricHistory.create({
        api: api.name,
        source: api.source,
        data: res.data,
        hash,
      });
      // log the change to the database
      log.info(`${api.name}/${api.source} changed (db updated)`);

      /* ---------- optional direct emit ---------- */
      // emit the change to the websocket
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
