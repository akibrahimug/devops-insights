/**
 * CHANGE STREAMS SERVICE UNIT TESTS
 *
 * Tests for MongoDB change streams functionality including WebSocket
 * integration, event handling, and error management.
 */

import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import { wireMetricChangeStream } from '@root/services/change-streams';
import { config } from '@root/config';

describe('Change Streams Service', () => {
  let mockSocketIO: jest.Mocked<SocketIOServer>;
  let mockChangeStream: any;
  let mockEmit: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEmit = jest.fn();
    mockSocketIO = {
      to: jest.fn().mockReturnValue({
        emit: mockEmit,
      }),
    } as any;

    mockChangeStream = {
      on: jest.fn(),
    };

    jest.spyOn(mongoose.connection, 'watch').mockReturnValue(mockChangeStream);
  });

  it('should initialize change stream with correct pipeline and event listeners', () => {
    const result = wireMetricChangeStream(
      mockSocketIO,
      config.EXTERNAL_API_NAME!,
    );

    expect(mongoose.connection.watch).toHaveBeenCalledWith(
      [
        {
          $match: {
            'ns.coll': 'metrics_latest',
            operationType: { $in: ['insert', 'update', 'replace'] },
          },
        },
        { $project: { fullDocument: 1 } },
      ],
      { fullDocument: 'updateLookup' },
    );

    expect(mockChangeStream.on).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(mockChangeStream.on).toHaveBeenCalledWith(
      'error',
      expect.any(Function),
    );
    expect(result).toBe(mockChangeStream);
  });

  it('should emit WebSocket events when document changes occur', () => {
    wireMetricChangeStream(mockSocketIO, config.EXTERNAL_API_NAME!);

    // Get the change event handler
    const changeHandler = mockChangeStream.on.mock.calls.find(
      (call: any) => call[0] === 'change',
    )[1];

    const mockChangeEvent = {
      fullDocument: {
        api: config.EXTERNAL_API_NAME,
        source: 'us-east',
        data: { status: 'ok', cpu: 45.2 },
        hash: 'abc123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    changeHandler(mockChangeEvent);

    expect(mockSocketIO.to).toHaveBeenCalledWith(
      `metrics:${config.EXTERNAL_API_NAME}:us-east`,
    );
    expect(mockEmit).toHaveBeenCalledWith('metrics-update', {
      api: config.EXTERNAL_API_NAME,
      source: 'us-east',
      data: { status: 'ok', cpu: 45.2 },
      timestamp: expect.any(String),
    });

    // Test with different source region but same API
    jest.clearAllMocks();
    const euChangeEvent = {
      fullDocument: {
        api: config.EXTERNAL_API_NAME,
        source: 'eu-west',
        data: { status: 'degraded', cpu: 85.7 },
        hash: 'def456',
      },
    };

    changeHandler(euChangeEvent);

    expect(mockSocketIO.to).toHaveBeenCalledWith(
      `metrics:${config.EXTERNAL_API_NAME}:eu-west`,
    );
    expect(mockEmit).toHaveBeenCalledWith('metrics-update', {
      api: config.EXTERNAL_API_NAME,
      source: 'eu-west',
      data: { status: 'degraded', cpu: 85.7 },
      timestamp: expect.any(String),
    });
  });

  it('should handle errors gracefully and skip invalid change events', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    wireMetricChangeStream(mockSocketIO, config.EXTERNAL_API_NAME!);

    // Get event handlers
    const changeHandler = mockChangeStream.on.mock.calls.find(
      (call: any) => call[0] === 'change',
    )[1];
    const errorHandler = mockChangeStream.on.mock.calls.find(
      (call: any) => call[0] === 'error',
    )[1];

    // Test error handling
    const mockError = new Error('Connection lost');
    errorHandler(mockError);

    expect(consoleSpy).toHaveBeenCalledWith('Change stream error:', mockError);

    // Test invalid change events (should not emit)
    const invalidEvents = [
      { fullDocument: null },
      { fullDocument: undefined },
      {},
    ];

    invalidEvents.forEach((invalidEvent) => {
      mockSocketIO.to.mockClear();
      changeHandler(invalidEvent);
      expect(mockSocketIO.to).not.toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
