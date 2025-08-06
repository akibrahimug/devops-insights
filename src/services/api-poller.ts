/**
 * EXTERNAL API POLLING SERVICE
 *
 * Periodically polls external APIs and caches results in Redis.
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
  name: string;
  source: Source;
  url: string;
  interval: number; // polling interval in ms
  cacheKey: string;
}

export class ApiPollerService {
  private redisClient: RedisClientType;
  private io: SocketIOServer | null = null;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private apiName = process.env.EXTERNAL_API_NAME!.toLowerCase();
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
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      await this.redisClient.connect();
      log.info('Redis connected for API polling service');
    } catch (error) {
      log.error('Failed to connect to Redis:', error);
    }
  }

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
    log.info('WebSocket server linked to API poller');
  }

  public startPolling() {
    log.info('Starting external API polling...');

    this.apis.forEach((api) => {
      // Initial poll
      this.pollApi(api);

      // Set up interval polling
      const interval = setInterval(() => {
        this.pollApi(api);
      }, api.interval);

      this.pollingIntervals.set(`${api.name}:${api.source}`, interval);
    });
  }

  private async pollApi(apiConfig: ExternalApiConfig) {
    try {
      log.debug(`Polling ${apiConfig.name}...`);

      // Fetch data from external API
      const response = await axios.get(apiConfig.url, {
        timeout: 5000,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DevOps-Insights-Dashboard/1.0',
        },
      });

      // Get previous data from cache
      const previousData = await this.redisClient.get(apiConfig.cacheKey);
      const currentData = JSON.stringify(response.data);

      // Cache the new data
      await this.redisClient.set(apiConfig.cacheKey, currentData, {
        EX: (apiConfig.interval * 2) / 1000, // Expire after 2x polling interval
      });

      // Check if data has changed
      if (previousData !== currentData) {
        log.info(`${apiConfig.name} data changed, broadcasting update`);

        // Broadcast to all connected WebSocket clients
        if (this.io) {
          this.io.emit('metrics-update', {
            source: apiConfig.name,
            data: response.data,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      log.error(`Failed to poll ${apiConfig.name}:`, error);
    }
  }

  public async getCachedMetrics(source?: string) {
    try {
      if (source) {
        const data = await this.redisClient.get(`metrics:${source}`);
        return data ? JSON.parse(data) : null;
      }

      // Get all cached metrics
      const metrics: any = {};
      for (const api of this.apis) {
        const data = await this.redisClient.get(api.cacheKey);
        metrics[api.name] = data ? JSON.parse(data) : null;
      }
      return metrics;
    } catch (error) {
      log.error('Failed to get cached metrics:', error);
      return null;
    }
  }

  public stopPolling() {
    log.info('Stopping API polling...');
    this.pollingIntervals.forEach((interval, name) => {
      clearInterval(interval);
      log.debug(`Stopped polling for ${name}`);
    });
    this.pollingIntervals.clear();
  }
}

export const apiPoller = new ApiPollerService();
