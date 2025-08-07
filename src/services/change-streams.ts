/**
 * MongoDB Change Streams → WebSocket bridge
 *
 * Responsibility:
 * - Watch 'metrics_latest' for INSERT/UPDATE/REPLACE events.
 * - For each change, emit a 'metrics-update' event to the per-source room, so
 *   only clients interested in that region receive the update.
 *
 * Notes:
 * - Requires MongoDB replica set (Atlas or local `rs.initiate()`).
 * - Wire this AFTER your mongoose.connect(...) has resolved.
 * - Return the stream so callers can close it on shutdown if desired.
 */

import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';

export function wireMetricChangeStream(io: SocketIOServer, apiName: string) {
  // Compute room name from the region (source)
  const roomFor = (source: string) => `metrics:${apiName}:${source}`;

  // Only watch the 'metrics_latest' collection and only for mutations that change doc content
  const pipeline = [
    {
      $match: {
        'ns.coll': 'metrics_latest',
        operationType: { $in: ['insert', 'update', 'replace'] },
      },
    },
    { $project: { fullDocument: 1 } }, // include the full updated document in each event
  ];

  // Start the change stream; 'updateLookup' ensures we always get fullDocument
  const stream = mongoose.connection.watch(pipeline, {
    fullDocument: 'updateLookup',
  });

  // On every DB change: broadcast to the appropriate room
  stream.on('change', (evt: any) => {
    const doc = evt.fullDocument;
    if (!doc) return;

    io.to(roomFor(doc.source)).emit('metrics-update', {
      api: doc.api,
      source: doc.source,
      data: doc.data,
      timestamp: new Date().toISOString(),
    });
  });

  // Always log errors; you may choose to exit the process so your orchestrator restarts it.
  stream.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Change stream error:', err);
  });

  return stream;
}
