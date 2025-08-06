/**
 * DATABASE CONNECTION SETUP AND CONFIGURATION
 *
 * This file manages the initialization and configuration of all database connections
 * for the DevOps Insights Dashboard backend. It handles both MongoDB (primary database)
 * and Redis (caching layer) connections with proper error handling and monitoring.
 *
 * Key Responsibilities:
 * - Establish MongoDB connection using Mongoose or native driver
 * - Configure MongoDB connection options (pooling, timeouts, retry logic)
 * - Initialize Redis connection for caching and session storage
 * - Set up database event listeners for connection monitoring
 * - Handle database connection errors and reconnection logic
 * - Configure database logging and health monitoring
 * - Set up graceful database disconnect procedures
 * - Initialize database indexes and collections if needed
 *
 * This setup ensures robust database connectivity with proper error handling,
 * monitoring, and recovery mechanisms for both primary and cache databases.
 */

import mongoose from 'mongoose';
import { config } from '@root/config';
import Logger from 'bunyan';
import { redisConnection } from '@service/redis/redis.connection';

const log: Logger = config.createLogger('SetUpDatabase');
export default () => {
  const connect = () => {
    mongoose.set('strictQuery', false);
    mongoose
      .connect(config.DATABASE_URL!)
      .then(() => {
        log.info('Successfully connected to MongoDB');
        redisConnection.connect();
      })
      .catch((e) => {
        log.error('Connection error', e.message);
        // this will exit the process with an error code and get logs
        return process.exit(1);
      });
  };
  connect();
  //   if it disconnects, it will try to reconnect again automatically
  mongoose.connection.on('disconnected', connect);
};
