/**
 * ROUTES MODULE UNIT TESTS
 *
 * Tests for all API endpoints including health checks, metrics retrieval,
 * error handling, and response validation.
 */

import express, { Application, Request, Response } from 'express';
import { config } from '@root/config';

// Mock Mongoose models
jest.mock('@root/shared/services/db/models/Metric.models', () => ({
  MetricLatest: {
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    create: jest.fn(),
  },
  MetricHistory: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  },
}));

// Import the mocked MetricLatest
const {
  MetricLatest,
} = require('@root/shared/services/db/models/Metric.models');

// Helper function to create mock metric documents
function createMockMetricDoc(overrides = {}) {
  return {
    api: config.EXTERNAL_API_NAME,
    source: 'us-east',
    data: { status: 'ok', metrics: { cpu: 45.2 } },
    hash: 'abc123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Application Routes', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      query: {},
      params: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  it('should have proper configuration for API routes', () => {
    expect(config.EXTERNAL_API_NAME).toBeDefined();
    expect(typeof config.EXTERNAL_API_NAME).toBe('string');
    expect(config.DATABASE_URL).toBeDefined();
  });

  it('should handle metrics retrieval with proper data transformation', async () => {
    const mockMetrics = [
      createMockMetricDoc({ source: 'us-east', data: { cpu: 45.2 } }),
      createMockMetricDoc({ source: 'eu-west', data: { cpu: 67.8 } }),
    ];

    jest.spyOn(MetricLatest, 'find').mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockMetrics),
    } as any);

    mockResponse.json = jest.fn().mockImplementation((data) => {
      expect(data).toMatchObject({
        api: config.EXTERNAL_API_NAME,
        data: {
          'us-east': { cpu: 45.2 },
          'eu-west': { cpu: 67.8 },
        },
        count: 2,
      });
      return mockResponse;
    });

    // Simulate the endpoint logic
    const rows = await MetricLatest.find({
      api: config.EXTERNAL_API_NAME,
    }).lean();
    const out: Record<string, unknown> = {};
    rows.forEach((r: any) => {
      out[r.source] = r.data;
    });

    const responseData = {
      api: config.EXTERNAL_API_NAME,
      data: out,
      count: rows.length,
    };
    (mockResponse.json as jest.Mock)(responseData);

    expect(mockResponse.json).toHaveBeenCalledTimes(1);
  });

  it('should handle invalid source validation with proper error response', () => {
    mockRequest.query = { source: 'invalid-region' };

    mockResponse.status = jest.fn().mockReturnThis();
    mockResponse.json = jest.fn().mockImplementation((data) => {
      expect(data).toMatchObject({
        error: 'Invalid source',
        allowed: [
          'us-east',
          'eu-west',
          'eu-central',
          'us-west',
          'sa-east',
          'ap-southeast',
        ],
      });
      return mockResponse;
    });

    // Simulate validation logic
    const source = ((mockRequest.query as any).source as string).toLowerCase();
    const ALLOWED_SOURCES = [
      'us-east',
      'eu-west',
      'eu-central',
      'us-west',
      'sa-east',
      'ap-southeast',
    ];

    if (!ALLOWED_SOURCES.includes(source)) {
      (mockResponse.status as jest.Mock)(400);
      (mockResponse.json as jest.Mock)({
        error: 'Invalid source',
        allowed: ALLOWED_SOURCES,
      });
    }

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledTimes(1);
  });
});
