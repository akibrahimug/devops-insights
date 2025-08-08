/**
 * BASE REDIS CACHE CLASS
 *
 * This file provides the foundational abstract class for all Redis caching operations
 * in the DevOps Insights Dashboard. It establishes a common interface and shared
 * functionality that all specific cache implementations will inherit from, with
 * particular focus on WebSocket session management and real-time data caching.
 *
 * Key Responsibilities:
 * - Establish Redis client connection using configuration settings
 * - Provide shared logging functionality for all cache operations
 * - Handle Redis connection error events in a standardized way
 * - Define the base structure that specific cache classes will extend
 * - Ensure consistent Redis client configuration across all cache implementations
 * - Support WebSocket session storage and retrieval operations
 * - Enable Redis pub/sub capabilities for real-time message broadcasting
 * - Provide foundation for real-time DevOps metrics caching
 *
 * This class is designed to be extended by specific cache implementations like
 * WebSocket session cache, real-time metrics cache, or user preference cache,
 * providing them with common Redis functionality while allowing for specialized
 * caching logic optimized for real-time dashboard operations.
 */

// Base class that all Redis cache implementations will inherit from
import Logger from "bunyan";
import { createClient } from "redis";
import { config } from "@root/config";

// Type definition for Redis client instance
export type RedisClient = ReturnType<typeof createClient>;

/**
 * Abstract base class for all Redis cache operations
 * Provides common Redis client setup and error handling functionality
 * Optimized for WebSocket session management and real-time data operations
 */
export abstract class BaseCache {
  client: RedisClient;
  log: Logger;

  /**
   * Constructor initializes Redis client and logger for the cache instance
   * Sets up the foundation for WebSocket session storage and real-time caching
   * @param cacheName - Identifier for this cache instance used in logging
   */
  constructor(cacheName: string) {
    // Initialize Redis client with connection URL from configuration
    this.client = createClient({ url: config.REDIS_HOST });
    // Create a named logger instance for this cache
    this.log = config.createLogger(cacheName);
    // Set up error event handling for the Redis client
    this.cacheError();
  }

  /**
   * Private method to set up Redis client error event handling
   * Logs any Redis connection or operation errors using the configured logger
   * Critical for maintaining WebSocket session integrity and real-time data reliability
   */
  private cacheError(): void {
    this.client.on("error", (error: unknown) => {
      this.log.error(error);
    });
  }
}
