/**
 * Metric models
 *
 * We maintain two collections:
 * 1) metrics_latest  — exactly ONE document per (api, source). Upserted on change.
 * 2) metrics_history — append-only log of all changes. Useful for charts or audits.
 *
 * Using Mongoose for schema + indices. You can switch to the native driver if preferred.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface MetricDoc extends Document {
  api: string; // Provider name
  source: string; // Region, e.g. "us-east"
  data: any; // Raw JSON payload from the external API
  hash: string; // Content hash of 'data' to detect changes quickly
  createdAt: Date;
  updatedAt: Date;
}

/** Latest snapshot per (api, source). Enforced unique via compound index. */
const MetricLatestSchema = new Schema<MetricDoc>(
  {
    api: { type: String, required: true, index: true },
    source: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, required: true },
    hash: { type: String, required: true },
  },
  { timestamps: true },
);
MetricLatestSchema.index({ api: 1, source: 1 }, { unique: true });

export const MetricLatest: Model<MetricDoc> =
  mongoose.models.MetricLatest ||
  mongoose.model<MetricDoc>(
    'MetricLatest',
    MetricLatestSchema,
    'metrics_latest',
  );

/** Append-only history of changes. */
const MetricHistorySchema = new Schema<MetricDoc>(
  {
    api: { type: String, required: true, index: true },
    source: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, required: true },
    hash: { type: String, required: true },
  },
  { timestamps: true },
);
MetricHistorySchema.index({ api: 1, source: 1, createdAt: -1 });

export const MetricHistory: Model<MetricDoc> =
  mongoose.models.MetricHistory ||
  mongoose.model<MetricDoc>(
    'MetricHistory',
    MetricHistorySchema,
    'metrics_history',
  );
