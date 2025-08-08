/**
 * TEST ENVIRONMENT CONFIGURATION
 *
 * Sets up the test environment with necessary environment variables
 * and configurations for all test suites.
 */

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.REDIS_HOST = 'redis://localhost:6379';
process.env.EXTERNAL_API_NAME = 'testapi';
process.env.DATABASE_URL = 'mongodb://127.0.0.1:27017/devops-insights-test';

// Mock axios globally for all tests
jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} }),
  put: jest.fn().mockResolvedValue({ data: {} }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
}));
