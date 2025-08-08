/**
 * CONFIGURATION MODULE UNIT TESTS
 *
 * Tests for the application configuration manager including
 * environment variable handling, logger creation, and validation.
 */

import { config } from '@root/config';
import bunyan from 'bunyan';

// Mock Bunyan logger
jest.mock('bunyan', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should load all required environment variables with correct types', () => {
    expect(config.DATABASE_URL).toBeDefined();
    expect(typeof config.DATABASE_URL).toBe('string');
    expect(config.NODE_ENV).toBe('test');
    expect(config.CLIENT_URL).toBe('http://localhost:3000');
    expect(config.REDIS_HOST).toBe('redis://localhost:6379');
    expect(config.EXTERNAL_API_NAME).toBeDefined();
    expect(typeof config.EXTERNAL_API_NAME).toBe('string');
    expect(config.PORT).toBe(5001);
  });

  it('should create bunyan logger with correct configuration', () => {
    const logger = config.createLogger('test-service');

    expect(bunyan.createLogger).toHaveBeenCalledWith({
      name: 'test-service',
      level: 'debug',
    });
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
  });

  it('should validate configuration without throwing errors', () => {
    expect(() => config.validate()).not.toThrow();
    expect(config).toHaveProperty('DATABASE_URL');
    expect(config).toHaveProperty('NODE_ENV');
    expect(config).toHaveProperty('PORT');
    expect(typeof config.createLogger).toBe('function');
    expect(typeof config.validate).toBe('function');
  });
});
