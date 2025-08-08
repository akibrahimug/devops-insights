/**
 * MINIMAL API ROUTES FOR EXTERNAL API CONSUMPTION
 *
 * Simple HTTP routes for health checks and serving cached external API data.
 * All real-time updates are handled via WebSockets.
 *
 * Architecture:
 * - Express: Basic health/status endpoints ONLY (metrics moved to WebSocket)
 * - WebSockets: Real-time updates AND initial data loading
 * - Redis: Cache for external API responses
 */

import { Application, Request, Response } from 'express';
import { config } from '@root/config';
import Logger from 'bunyan';
import { MetricLatest } from '@root/shared/services/db/models/Metric.models';
import apiRegions from '@root/static/api-regions.json';

const log: Logger = config.createLogger('routes');
const BASE_PATH = '/api/v1';
const apiName = (config.EXTERNAL_API_NAME || '').toLowerCase();
const ALLOWED_SOURCES = apiRegions.allowed_sources as Array<string>;
type Source = (typeof ALLOWED_SOURCES)[number];

export default (app: Application) => {
  // Health check endpoint
  app.get(`${BASE_PATH}/health`, (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'devops-insights-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // DISABLED: HTTP metrics endpoints - use WebSocket instead
  /*
  // Get cached metrics from Redis (populated by external API polling)
  app.get(`${BASE_PATH}/metrics`, async (req: Request, res: Response) => {
    try {
      const source = (req.query.source as string | undefined)?.toLowerCase();
      if (source) {
        if (!ALLOWED_SOURCES.includes(source as Source)) {
          return res
            .status(400)
            .json({ error: 'Invalid source', allowed: ALLOWED_SOURCES });
        }
        const doc = await MetricLatest.findOne({ api: apiName, source }).lean();
        if (!doc)
          return res.status(404).json({ error: 'No data yet for this source' });
        return res.json({
          api: apiName,
          source,
          data: doc.data,
          updatedAt: doc.updatedAt,
        });
      }
      // no source → return all latest by source
      const rows = await MetricLatest.find({ api: apiName }).lean();
      const out: Record<string, unknown> = {};
      rows.forEach((r: any) => {
        out[r.source] = r.data;
      });
      return res.json({ api: apiName, data: out, count: rows.length });
    } catch (error) {
      log.error('Error fetching metrics:', error);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Get specific external API data (e.g., /api/metrics/)
  app.get(
    `${BASE_PATH}/metrics/:source`,
    async (req: Request, res: Response) => {
      try {
        const source = (req.params.source || '').toLowerCase();
        if (!ALLOWED_SOURCES.includes(source as Source)) {
          return res
            .status(400)
            .json({ error: 'Invalid source', allowed: ALLOWED_SOURCES });
        }
        const doc = await MetricLatest.findOne({ api: apiName, source }).lean();
        if (!doc)
          return res.status(404).json({ error: 'No data yet for this source' });
        return res.json({
          api: apiName,
          source,
          data: doc.data,
          updatedAt: doc.updatedAt,
        });
      } catch (error) {
        log.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
      }
    },
  );
  */

  // HTTP endpoint returns redirect to WebSocket for metrics
  app.get(`${BASE_PATH}/metrics`, (req: Request, res: Response) => {
    res.status(426).json({
      error: 'Metrics data only available via WebSocket',
      websocket_url: '/socket.io/',
      instructions: {
        connect: 'Connect to WebSocket server',
        get_data: 'socket.emit("metrics:get", { source?: "us-east" })',
        listen: 'socket.on("metrics:data", (data) => { ... })',
        subscribe: 'socket.emit("metrics:subscribe", { source: "us-east" })',
        updates: 'socket.on("metrics-update", (data) => { ... })',
      },
    });
  });

  app.get(`${BASE_PATH}/metrics/:source`, (req: Request, res: Response) => {
    res.status(426).json({
      error: 'Metrics data only available via WebSocket',
      websocket_url: '/socket.io/',
      source: req.params.source,
      instructions: {
        connect: 'Connect to WebSocket server',
        get_data: `socket.emit("metrics:get", { source: "${req.params.source}" })`,
        listen: 'socket.on("metrics:data", (data) => { ... })',
        subscribe: `socket.emit("metrics:subscribe", { source: "${req.params.source}" })`,
        updates: 'socket.on("metrics-update", (data) => { ... })',
      },
    });
  });

  // Basic system info
  app.get(`${BASE_PATH}/info`, (req: Request, res: Response) => {
    res.json({
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      websocket_enabled: true,
      websocket_only_metrics: true,
      redis_enabled: false,
      external_apis: [apiName],
    });
  });
};
