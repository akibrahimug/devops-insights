// History utilities for aggregations and chart-friendly transforms.
// These helpers operate on the WebSocket `metrics:history` payload shape.

export interface HistoryItem<T = any> {
  api?: string;
  source: string;
  data: T;
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export type MetricExtractor<T = any> = (data: T) => number;

/* ---------- core helpers ---------- */

/** Safe nested getter with a default fallback. */
export function getIn(object: any, path: string | string[], defaultValue = 0) {
  const segments = Array.isArray(path) ? path : String(path).split(".");
  let cursor: any = object;
  for (const key of segments) {
    if (cursor == null) return defaultValue;
    cursor = cursor[key];
  }
  const n = typeof cursor === "string" ? Number(cursor) : cursor;
  return Number.isFinite(n) ? (n as number) : defaultValue;
}

/** Filter items to a time window (inclusive). */
export function filterByRange<T = any>(
  items: HistoryItem<T>[],
  range?: { from?: string; to?: string }
): HistoryItem<T>[] {
  if (!range?.from && !range?.to) return items;
  const fromMs = range?.from ? new Date(range.from).getTime() : -Infinity;
  const toMs = range?.to ? new Date(range.to).getTime() : Infinity;
  return items.filter((it) => {
    const ts = new Date(it.createdAt).getTime();
    return ts >= fromMs && ts <= toMs;
  });
}

/** Group items by their `source` field. */
export function groupBySource<T = any>(items: HistoryItem<T>[]) {
  const map = new Map<string, HistoryItem<T>[]>();
  for (const it of items) {
    const arr = map.get(it.source) || [];
    arr.push(it);
    map.set(it.source, arr);
  }
  return map;
}

/* ---------- aggregations ---------- */

/** Sum a metric across all sources in an optional range. */
export function sumAcrossAllSources<T = any>(
  items: HistoryItem<T>[],
  extractor: MetricExtractor<T>,
  range?: { from?: string; to?: string }
): number {
  const filtered = filterByRange(items, range);
  return filtered.reduce((acc, it) => acc + (extractor(it.data) || 0), 0);
}

/** Sum a metric per source in an optional range. */
export function sumPerSource<T = any>(
  items: HistoryItem<T>[],
  extractor: MetricExtractor<T>,
  range?: { from?: string; to?: string }
): Record<string, number> {
  const filtered = filterByRange(items, range);
  const bySrc = groupBySource(filtered);
  const out: Record<string, number> = {};
  for (const [src, list] of bySrc) {
    out[src] = list.reduce((acc, it) => acc + (extractor(it.data) || 0), 0);
  }
  return out;
}

/**
 * Compress history by time buckets (default: minute) and sum across sources
 * Useful for building global time-series lines.
 */
/**
 * Compress history by time buckets and sum across sources. Useful for single
 * global series lines.
 */
export function compressByTime<T = any>(
  items: HistoryItem<T>[],
  extractor: MetricExtractor<T>,
  bucketMs = 60_000,
  range?: { from?: string; to?: string }
): Array<{ bucketStart: string; value: number }> {
  const filtered = filterByRange(items, range);
  const buckets = new Map<number, number>();
  for (const it of filtered) {
    const ts = new Date(it.createdAt).getTime();
    const bucket = Math.floor(ts / bucketMs) * bucketMs;
    const prev = buckets.get(bucket) || 0;
    buckets.set(bucket, prev + (extractor(it.data) || 0));
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ms, value]) => ({ bucketStart: new Date(ms).toISOString(), value }));
}

/**
 * Per-source time compression: for each source, sum the metric per time bucket.
 */
/** Per-source bucketed compression into aligned time-series arrays. */
export function compressPerSourceByTime<T = any>(
  items: HistoryItem<T>[],
  extractor: MetricExtractor<T>,
  bucketMs = 60_000,
  range?: { from?: string; to?: string }
): Record<string, Array<{ bucketStart: string; value: number }>> {
  const filtered = filterByRange(items, range);
  const bySrc = groupBySource(filtered);
  const out: Record<string, Array<{ bucketStart: string; value: number }>> = {};

  // Determine the full time range to fill
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - bucketMs * 60); // 60 buckets by default
  const fromTime = range?.from ? new Date(range.from) : defaultFrom;
  const toTime = range?.to ? new Date(range.to) : now;

  for (const [src, list] of bySrc) {
    const buckets = new Map<number, number>();

    // Fill existing data
    for (const it of list) {
      const ts = new Date(it.createdAt).getTime();
      const bucket = Math.floor(ts / bucketMs) * bucketMs;
      const prev = buckets.get(bucket) || 0;
      buckets.set(bucket, prev + (extractor(it.data) || 0));
    }

    // Fill complete time range
    const startBucket = Math.floor(fromTime.getTime() / bucketMs) * bucketMs;
    const endBucket = Math.floor(toTime.getTime() / bucketMs) * bucketMs;

    for (let bucket = startBucket; bucket <= endBucket; bucket += bucketMs) {
      if (!buckets.has(bucket)) {
        buckets.set(bucket, 0);
      }
    }

    out[src] = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ms, value]) => ({
        bucketStart: new Date(ms).toISOString(),
        value,
      }));
  }

  return out;
}

/* ---------- common extractors (cards/charts) ---------- */

/** Extract session count from history data. */
export const extractSessions: MetricExtractor = (data: any) =>
  getIn(data, ["results", "stats", "session"], 0);

/** Extract active connections from history data. */
export const extractActiveConnections: MetricExtractor = (data: any) =>
  getIn(data, ["results", "stats", "server", "active_connections"], 0);

/** Extract requests per second from history data. */
export const extractRequestsPerSecond: MetricExtractor = (data: any) =>
  getIn(data, ["results", "stats", "server", "rps"], 0);

/** Extract CPU load from history data. */
export const extractCpuLoad: MetricExtractor = (data: any) =>
  getIn(data, ["results", "stats", "server", "cpu_load"], 0);

/** Extract CPU core count from history data. */
export const extractCpus: MetricExtractor = (data: any) =>
  getIn(data, ["results", "stats", "server", "cpus"], 0);

/** Extract wait time from history data. */
export const extractWaitTime: MetricExtractor = (data: any) =>
  getIn(data, ["results", "stats", "server", "wait_time"], 0);

/** Extract timers from history data. */
export const extractTimers: MetricExtractor = (data: any) =>
  getIn(data, ["results", "stats", "server", "timers"], 0);

/** Extract online user count from history data. */
export const extractOnline: MetricExtractor = (data: any) =>
  getIn(data, ["results", "stats", "online"], 0);
// Heuristic extractors for memory and disk usage; adjust paths as real payload requires
export const extractMemoryUsage: MetricExtractor = (data: any) => {
  const candidates = [
    ["results", "stats", "server", "memory_usage"],
    ["results", "stats", "server", "memory"],
    ["results", "stats", "memory"],
  ];
  for (const p of candidates) {
    const v = getIn(data, p, NaN);
    if (Number.isFinite(v)) return v as number;
  }
  return 0;
};

export const extractDiskUsage: MetricExtractor = (data: any) => {
  const candidates = [
    ["results", "stats", "server", "disk_usage"],
    ["results", "stats", "server", "disk"],
    ["results", "stats", "disk"],
  ];
  for (const p of candidates) {
    const v = getIn(data, p, NaN);
    if (Number.isFinite(v)) return v as number;
  }
  return 0;
};

/* ---------- convenience bundles for the dashboard ---------- */

export function computeDashboardTotals(
  items: HistoryItem[],
  range?: { from?: string; to?: string }
) {
  return {
    sessions: sumAcrossAllSources(items, extractSessions, range),
    activeConnections: sumAcrossAllSources(
      items,
      extractActiveConnections,
      range
    ),
    requestsPerSecond: sumAcrossAllSources(
      items,
      extractRequestsPerSecond,
      range
    ),
    cpus: sumAcrossAllSources(items, extractCpus, range),
  };
}
