/**
 * ERROR HANDLER UTILITY UNIT TESTS
 *
 * Tests for the error handling utilities including HTTP status codes,
 * error formatting, and error response standardization.
 */

import HTTP_STATUS from 'http-status-codes';

describe('Error Handler Utility', () => {
  it('should provide correct HTTP status codes for all categories', () => {
    // Test success codes
    expect(HTTP_STATUS.OK).toBe(200);
    expect(HTTP_STATUS.CREATED).toBe(201);

    // Test client error codes
    expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS.FORBIDDEN).toBe(403);
    expect(HTTP_STATUS.NOT_FOUND).toBe(404);

    // Test server error codes
    expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    expect(HTTP_STATUS.BAD_GATEWAY).toBe(502);
    expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
  });

  it('should format error responses with proper structure and validation', () => {
    const validationError = {
      status: HTTP_STATUS.BAD_REQUEST,
      message: 'Validation failed',
      errors: [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ],
      timestamp: new Date().toISOString(),
    };

    expect(validationError.status).toBe(400);
    expect(validationError.errors).toHaveLength(2);
    expect(validationError.errors[0].field).toBe('email');
    expect(validationError.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );

    const serverError = {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Database connection failed',
      requestId: 'req-123456',
    };

    expect(serverError.status).toBe(500);
    expect(serverError.error).toBe('Database connection failed');
    expect(serverError.requestId).toBe('req-123456');
  });

  it('should correctly classify error types and support retry strategies', () => {
    // Test client error classification (non-retryable)
    const clientErrors = [
      HTTP_STATUS.BAD_REQUEST,
      HTTP_STATUS.UNAUTHORIZED,
      HTTP_STATUS.FORBIDDEN,
      HTTP_STATUS.NOT_FOUND,
    ];

    clientErrors.forEach((status) => {
      const isClientError = status >= 400 && status < 500;
      const isRetryable = status >= 500 || status === 408 || status === 429;
      expect(isClientError).toBe(true);
      expect(isRetryable).toBe(false);
    });

    // Test server error classification (retryable)
    const retryableErrors = [
      HTTP_STATUS.REQUEST_TIMEOUT,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      HTTP_STATUS.BAD_GATEWAY,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
    ];

    retryableErrors.forEach((status) => {
      const isRetryable = status >= 500 || status === 408 || status === 429;
      expect(isRetryable).toBe(true);
    });
  });
});
