/**
 * REDIS CONNECTION MANAGER
 *
 * This file manages the Redis database connection for the DevOps Insights Dashboard.
 * It provides a centralized way to establish and maintain the Redis connection
 * that will be used for WebSocket session management, real-time data caching,
 * pub/sub messaging for WebSocket broadcasting, and temporary metrics storage.
 *
 * Key Responsibilities:
 * - Extend the BaseCache class with connection-specific functionality
 * - Establish and maintain the Redis server connection
 * - Handle connection errors and provide error logging
 * - Provide a singleton Redis connection instance for the entire application
 * - Support WebSocket session storage and management
 * - Enable Redis pub/sub for broadcasting messages to multiple WebSocket clients
 * - Cache real-time DevOps metrics for efficient dashboard updates
 * - Store temporary data for WebSocket connection state management
 *
 * This connection manager ensures that the application has a reliable Redis connection
 * for WebSocket session management, real-time data caching, and pub/sub messaging
 * that powers the real-time DevOps insights dashboard functionality.
 */

import Logger from 'bunyan';
import { config } from '@root/config';
import { BaseCache } from '@service/redis/base.cache';

// Create a dedicated logger for Redis connection operations
const log: Logger = config.createLogger('redisConnection');

/**
 * Redis connection management class that extends BaseCache
 * Handles the establishment and maintenance of the Redis database connection
 * Optimized for WebSocket session management and real-time data operations
 */
class RedisConnection extends BaseCache {
  constructor() {
    // Initialize with specific cache name for Redis connection logging
    super('redisConnection');
  }

  /**
   * Establishes connection to the Redis server
   * Includes error handling and optional connection testing
   * Critical for WebSocket session storage and real-time data caching
   * @returns Promise that resolves when connection is established
   */
  async connect(): Promise<void> {
    try {
      // Establish connection to Redis server using the configured client
      await this.client.connect();

      // Optional: Test Redis connection with ping command
      // Uncommented for debugging - can be enabled to verify connection
      // const res = await this.client.ping();
      // console.log(res, 'redis');
    } catch (error) {
      // Log any connection errors using the configured logger
      log.error(error);
    }
  }
}

// Export singleton instance for use throughout the application
export const redisConnection: RedisConnection = new RedisConnection();
