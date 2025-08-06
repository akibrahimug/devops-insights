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

const log: Logger = config.createLogger('routes');
const BASE_PATH = '/api/v1';

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
      const source = req.query.source as string;
      const metrics = await apiPoller.getCachedMetrics(source);

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Get specific external API data (e.g., /api/metrics/upscope)
  app.get(
    `${BASE_PATH}/metrics/:source`,
    async (req: Request, res: Response) => {
      try {
        const metrics = await apiPoller.getCachedMetrics(req.params.source);

        if (!metrics) {
          return res.status(404).json({ error: 'Source not found' });
        }

        res.json({
          success: true,
          source: req.params.source,
          data: metrics,
          timestamp: new Date().toISOString(),
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
      redis_enabled: true,
      external_apis: [process.env.EXTERNAL_API_NAME!],
    });
  });
};
