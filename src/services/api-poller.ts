/**
 * EXTERNAL API POLLING SERVICE
 *
 * Periodically polls external APIs and caches results in Redis(I will change this after I setup the DB)
 * Broadcasts changes via WebSocket when data updates.
 */

import axios from 'axios';
import { createClient, RedisClientType } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '@root/config';
import Logger from 'bunyan';

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

interface ExternalApiConfig {
  name: string; // provider, e.g. "upscope"
  source: Source; // region, e.g. "us-east"
  url: string;
  interval: number; // polling interval in ms
  cacheKey: string; // e.g. metrics:upscope:us-east
}

export class ApiPollerService {
  private redisClient: RedisClientType;
  private io: SocketIOServer | null = null;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private apiName = (config.EXTERNAL_API_NAME || 'upscope').toLowerCase();
  private readonly redisRequired: boolean =
    String(config.REDIS_REQUIRED ?? 'true').toLowerCase() === 'true';

  // room name helper (used only for per-source rooms)
  private roomFor = (source: Source) => `metrics:${this.apiName}:${source}`;

  // External APIs to poll
  private apis: ExternalApiConfig[] = SOURCES.map((source) => ({
    name: this.apiName,
    source,
    url: `https://data--${source}.${this.apiName}.io/status?stats=1`,
    interval: 30_000, // 30 seconds
    cacheKey: `metrics:${this.apiName}:${source}`,
  }));

  constructor() {
    this.redisClient = createClient({ url: config.REDIS_HOST });
    // We connect during startPolling(); constructor does not swallow errors.
  }

  private async initializeRedis() {
    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }
      log.info('Redis connected for API polling service');
    } catch (error) {
      log.error('Failed to connect to Redis:', error);
      if (this.redisRequired) {
        // Fail fast so your process manager restarts the service
        throw error;
      } else {
        log.warn('Continuing without Redis (REDIS_REQUIRED=false).');
      }
    }
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
    log.info('WebSocket server linked to API poller');
  }

  public async startPolling() {
    log.info('Starting external API polling...');

    // Ensure Redis is ready (may throw if required)
    await this.initializeRedis();

    // Idempotent start (useful with nodemon/hot reloads)
    if (this.pollingIntervals.size > 0) {
      log.warn('Polling already active; restarting...');
      this.stopPolling();
    }

    this.apis.forEach((api) => {
      const key = api.cacheKey; // unique per target

      // Guard against duplicates
      const existing = this.pollingIntervals.get(key);
      if (existing) {
        clearInterval(existing);
        this.pollingIntervals.delete(key);
      }

      // Initial poll
      void this.pollApi(api);

      // Schedule
      const interval = setInterval(() => {
        void this.pollApi(api);
      }, api.interval);

      this.pollingIntervals.set(key, interval);
    });

    log.info(`Polling ${this.pollingIntervals.size} API targets`);
  }

  private async pollApi(apiConfig: ExternalApiConfig) {
    try {
      log.debug(`Polling ${apiConfig.name}/${apiConfig.source}...`);

      // Fetch data from external API
      const response = await axios.get(apiConfig.url, {
        timeout: 5000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DevOps-Insights-Dashboard/1.0',
        },
      });

      // If Redis isn’t connected, skip cache ops (prevents runtime errors)
      if (!this.redisClient.isOpen) {
        log.warn('Redis not connected, skipping cache operations');
        return;
      }

      // Get previous data from cache
      const previousData = await this.redisClient.get(apiConfig.cacheKey);
      const currentData = JSON.stringify(response.data);

      // Cache the new data
      await this.redisClient.set(apiConfig.cacheKey, currentData, {
        EX: Math.floor((apiConfig.interval * 2) / 1000), // Expire after 2x polling interval
      });

      // Check if data has changed
      if (previousData !== currentData) {
        log.info(
          `${apiConfig.name}/${apiConfig.source} changed, broadcasting update`,
        );

        // Recommended: broadcast only to the per-source room:
        this.io?.to(this.roomFor(apiConfig.source)).emit('metrics-update', {
          api: apiConfig.name,
          source: apiConfig.source,
          data: response.data,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      log.error(`Failed to poll ${apiConfig.name}/${apiConfig.source}:`, error);
    }
  }

  /**
   * Read cached metrics. If `source` is provided, returns that region only.
   * Otherwise returns a map of { [source]: data }.
   */
  public async getCachedMetrics(source?: string) {
    try {
      if (!this.redisClient.isOpen) {
        log.warn('Redis not connected, cannot read cached metrics');
        return source ? null : {};
      }

      if (source) {
        const key = `metrics:${this.apiName}:${source.toLowerCase()}`;
        const data = await this.redisClient.get(key);
        return data ? JSON.parse(data) : null;
      }

      // Get all cached metrics, keyed by source
      const metrics: Record<string, unknown> = {};
      for (const api of this.apis) {
        const data = await this.redisClient.get(api.cacheKey);
        metrics[api.source] = data ? JSON.parse(data) : null;
      }
      return metrics;
    } catch (error) {
      log.error('Failed to get cached metrics:', error);
      return null;
    }
  }

  public stopPolling() {
    log.info('Stopping API polling...');
    for (const [name, interval] of this.pollingIntervals) {
      clearInterval(interval);
      log.debug(`Stopped polling for ${name}`);
    }
    this.pollingIntervals.clear();
  }
}

export const apiPoller = new ApiPollerService();
