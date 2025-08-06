/**
 * APPLICATION CONFIGURATION MANAGER
 *
 * This file manages all environment-specific configuration for the DevOps Insights Dashboard backend.
 * It centralizes configuration management, environment variable handling, and provides a single
 * source of truth for application settings across different deployment environments.
 *
 * Key Responsibilities:
 * - Load and validate environment variables from .env files
 * - Provide default values for local development
 * - Manage database connection strings (MongoDB)
 * - Configure Redis cache connection settings
 * - Set up client URL for CORS and frontend communication
 * - Create standardized logging instances using Bunyan
 * - Validate that all required environment variables are properly set
 *
 * This configuration is used throughout the application to ensure consistent
 * settings and proper environment-specific behavior for development, staging, and production.
 */

import dotenv from "dotenv";
import bunyan from "bunyan";

// Load environment variables from .env file
dotenv.config({});

class Config {
  public DATABASE_URL: string | undefined;
  public NODE_ENV: string | undefined;
  public CLIENT_URL: string | undefined;
  public REDIS_HOST: string | undefined;

  // Default MongoDB connection string for local development environment
  private readonly DEFAULT_DATABASE_URL =
    "mongodb://127.0.0.1:27017/devops-insights-backend";

  constructor() {
    // Initialize configuration properties with environment variables or defaults
    this.DATABASE_URL = process.env.DATABASE_URL || this.DEFAULT_DATABASE_URL;
    this.NODE_ENV = process.env.NODE_ENV || "";
    this.CLIENT_URL = process.env.CLIENT_URL || "";
    this.REDIS_HOST = process.env.REDIS_HOST || "";
  }

  /**
   * Creates a configured Bunyan logger instance for consistent logging across the application
   * @param name - The name identifier for this logger instance
   * @returns Configured Bunyan logger with debug level enabled
   */
  public createLogger(name: string): bunyan {
    return bunyan.createLogger({ name, level: "debug" });
  }

  /**
   * Validates that all required environment variables are properly set
   * Throws an error if any required configuration is missing
   * This should be called during application startup to fail fast on configuration issues
   */
  public validate(): void {
    for (const [key, value] of Object.keys(this)) {
      if (!value) {
        throw new Error(`Environment variable ${key} is not set`);
      }
    }
  }
}

// Export a singleton instance of the configuration for use throughout the application
export const config: Config = new Config();
