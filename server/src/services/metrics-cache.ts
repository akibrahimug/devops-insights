/**
 * METRICS CACHE
 *
 * In-memory snapshot of the most recent payload per source, fed by the poller.
 * Used to serve `metrics:get` without a Mongo round-trip and to make first-paint
 * resilient when Atlas (M0) is mid-wake on a cold start.
 *
 * Decoupled from Mongo on purpose: cache.set runs before the DB write, so
 * Atlas-asleep does not block the dashboard from rendering.
 */

import apiRegions from '@root/static/api-regions.json';

interface CacheEntry {
  data: unknown;
  updatedAt: Date;
}

class MetricsCache {
  private store = new Map<string, CacheEntry>();
  private readonly expectedSources = new Set<string>(
    apiRegions.allowed_sources,
  );
  private readyResolvers: Array<() => void> = [];
  private ready = false;

  public set(source: string, data: unknown, updatedAt: Date = new Date()): void {
    this.store.set(source, { data, updatedAt });
    if (!this.ready && this.isReady()) {
      this.ready = true;
      const resolvers = this.readyResolvers;
      this.readyResolvers = [];
      resolvers.forEach((r) => r());
    }
  }

  public get(source: string): CacheEntry | null {
    return this.store.get(source) ?? null;
  }

  public getAll(): {
    data: Record<string, unknown>;
    updatedAtBySource: Record<string, Date>;
    count: number;
  } {
    const data: Record<string, unknown> = {};
    const updatedAtBySource: Record<string, Date> = {};
    this.store.forEach((entry, source) => {
      data[source] = entry.data;
      updatedAtBySource[source] = entry.updatedAt;
    });
    return { data, updatedAtBySource, count: this.store.size };
  }

  /** True once every expected source has been populated at least once. */
  public isReady(): boolean {
    if (this.expectedSources.size === 0) return this.store.size > 0;
    for (const src of this.expectedSources) {
      if (!this.store.has(src)) return false;
    }
    return true;
  }

  /**
   * Resolves when the cache has at least one entry for every expected source.
   * Used to gate `server.listen()` so first-paint clients always get data.
   */
  public whenReady(): Promise<void> {
    if (this.isReady()) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.readyResolvers.push(resolve);
    });
  }

  public clear(): void {
    this.store.clear();
    this.ready = false;
  }
}

export const metricsCache = new MetricsCache();
export type { CacheEntry };
