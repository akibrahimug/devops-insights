/**
 * MINIMAL API ROUTES FOR EXTERNAL API CONSUMPTION
 *
 * Simple HTTP routes for health checks and serving cached external API data.
 * All real-time updates are handled via WebSockets.
 *
 * Architecture:
 * - Express: Basic health/status endpoints and cached data serving
 * - WebSockets: Real-time updates when external API data changes
 * - Redis: Cache for external API responses (Upscope, etc.)
 */

import { Application, Request, Response } from 'express';
import { config } from '@root/config';
import { apiPoller } from '@root/services/api-poller';
import Logger from 'bunyan';
import { MetricLatest } from './models/Metric.models';
import apiRegions from '@root/static/api-regions.json';

const log: Logger = config.createLogger('routes');
const BASE_PATH = '/api/v1';
const apiName = (config.EXTERNAL_API_NAME || 'upscope').toLowerCase();
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

  // Get specific external API data (e.g., /api/metrics/upscope)
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

  // Basic system info
  app.get(`${BASE_PATH}/info`, (req: Request, res: Response) => {
    res.json({
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      websocket_enabled: true,
      redis_enabled: false,
      external_apis: [apiName],
    });
  });
};
