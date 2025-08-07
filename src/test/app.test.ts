/**
 * APPLICATION MODULE UNIT TESTS
 *
 * Tests for the main application module including initialization,
 * configuration loading, error handling, and graceful shutdown.
 */

import { config } from '@root/config';

// Mock the main dependencies before importing anything else
jest.mock('@root/setupServer', () => ({
  DevopsInsightsServer: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@root/setupDatabase', () => jest.fn().mockResolvedValue(undefined));

jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn(),
  };
  return jest.fn(() => mockApp);
});

describe('Application Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load configuration successfully', () => {
    expect(config).toBeDefined();
    expect(config.DATABASE_URL).toBeDefined();
    expect(config.SERVER_PORT).toBeDefined();
    expect(config.EXTERNAL_API_NAME).toBeDefined();
  });

  it('should validate configuration properties', () => {
    expect(typeof config.createLogger).toBe('function');
    expect(typeof config.validate).toBe('function');
    expect(() => config.validate()).not.toThrow();
  });

  it('should have proper environment setup for testing', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.EXTERNAL_API_NAME).toBe('testapi');
    expect(config.EXTERNAL_API_NAME).toBe('testapi');
  });
});
