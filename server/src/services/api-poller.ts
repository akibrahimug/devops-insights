/**
 * EXTERNAL API POLLING SERVICE  (Mongo → WS, auto-fallback)
 *
 * - Polls every region, hashes payload, writes to Mongo if it changed.
 * - When `directEmit` is true, emits to WebSocket room right here.
 *   Otherwise, a MongoDB change-stream module will broadcast.
 * - This service is used to poll the external api and store the data in the database.
 * - This service is used to emit the data to the websocket.
 */

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
import { generateFakeMetrics } from './fake-data-generator';
import { metricsCache } from './metrics-cache';

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
  private apiName = (config.EXTERNAL_API_NAME || '').toLowerCase();
  private leader?: RedisLeaderLock;
  private cancelRetry?: () => void;
  /** When true, poller emits directly instead of relying on change streams */
  private directEmit = false;
  /** Tracks the last hash we emitted per source, so we still broadcast on
   *  hash change even when Mongo is unreachable. */
  private lastEmittedHash = new Map<string, string>();
  public enableDirectEmit() {
    this.directEmit = true;
  }
  /**
   * Run the first poll for all sources in parallel, then schedule recurring
   * intervals. Returns a promise that resolves after the first pass settles
   * (success or Mongo failure — never rejects). Used by setupServer to gate
   * `listen()` on a warm cache.
   */
  private async beginIntervals(): Promise<void> {
    const firstPass = this.apis.map((api) => this.pollOnce(api));
    // schedule recurring intervals immediately so cadence is correct even if
    // first pass takes a moment
    this.apis.forEach((api) => {
      const key = `${api.name}:${api.source}`;
      this.intervals.set(
        key,
        setInterval(() => void this.pollOnce(api), api.interval),
      );
    });
    log.info(`Polling ${this.intervals.size} API targets`);
    await Promise.allSettled(firstPass);
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
  public async startPolling(): Promise<void> {
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
        await this.beginIntervals();
      });
      log.info('Attempting leader election via Redis for API poller');
      // Non-leader instances resolve immediately; they serve from cache that
      // gets populated by change-stream broadcasts from the leader.
      return;
    }
    // No Redis → single instance mode
    await this.beginIntervals();
  }

  public stopPolling() {
    if (this.cancelRetry) this.cancelRetry();
    this.cancelRetry = undefined;
    this.intervals.forEach(clearInterval);
    this.intervals.clear();
    this.lastEmittedHash.clear();
    void this.leader?.release().catch(() => {});
    this.leader = undefined;
  }

  /* ---------- core polling ---------- */

  private async pollOnce(api: ExternalApi) {
    // Generate fake data (fast, deterministic-per-call). Real HTTP polling
    // is intentionally disabled — fake data keeps cold start cheap.
    const fakeData = generateFakeMetrics(api.source);
    const updatedAt = new Date();
    const json = JSON.stringify(fakeData);
    const hash = crypto.createHash('sha1').update(json).digest('hex');

    // Populate the in-memory cache FIRST. Decoupled from Mongo so a cold/asleep
    // Atlas can never block first-paint.
    metricsCache.set(api.source, fakeData, updatedAt);

    log.debug(`${api.name}/${api.source} polled, hash=${hash.substring(0, 8)}`);

    // Best-effort Mongo write. If Atlas is asleep or unreachable, swallow and
    // continue — the cache + directEmit still serve clients.
    try {
      const existing = await MetricLatest.findOne({
        api: api.name,
        source: api.source,
      })
        .select('hash')
        .lean();

      if (existing?.hash !== hash) {
        await MetricLatest.updateOne(
          { api: api.name, source: api.source },
          { $set: { data: fakeData, hash } },
          { upsert: true },
        );
        await MetricHistory.create({
          api: api.name,
          source: api.source,
          data: fakeData,
          hash,
        });
        log.info(
          `${api.name}/${api.source} changed (db updated) - hash: ${hash.substring(0, 8)}...`,
        );
      }
    } catch (err: any) {
      log.warn(
        {
          api: `${api.name}/${api.source}`,
          message: err?.message,
          code: err?.code,
        },
        'Mongo write failed; serving from cache',
      );
    }

    // Direct emit to subscribed sockets. Fires whenever the hash differs from
    // what we last broadcast for this source — so first poll always emits, and
    // subsequent emits happen even when Mongo is unreachable. When change
    // streams are wired this is skipped (directEmit=false).
    if (this.directEmit && this.io && this.lastEmittedHash.get(api.source) !== hash) {
      this.io.to(`metrics:${api.name}:${api.source}`).emit('metrics-update', {
        api: api.name,
        source: api.source,
        data: fakeData,
        timestamp: updatedAt.toISOString(),
      });
      this.lastEmittedHash.set(api.source, hash);
      log.debug(
        `${api.name}/${api.source} emitted metrics-update to room (directEmit)`,
      );
    }
  }
}

export const apiPoller = new ApiPollerService();
