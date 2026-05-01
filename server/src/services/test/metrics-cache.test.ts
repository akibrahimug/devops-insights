/**
 * METRICS CACHE TESTS
 *
 * Verifies the in-memory cache contract used by the poller and the
 * metrics:get socket handler.
 */

import { metricsCache } from '@root/services/metrics-cache';

describe('MetricsCache', () => {
  beforeEach(() => {
    metricsCache.clear();
  });

  it('returns null for unknown sources', () => {
    expect(metricsCache.get('us-east')).toBeNull();
  });

  it('stores and retrieves a single source', () => {
    const ts = new Date();
    metricsCache.set('us-east', { cpu: 1 }, ts);
    expect(metricsCache.get('us-east')).toEqual({
      data: { cpu: 1 },
      updatedAt: ts,
    });
  });

  it('overwrites prior value on the same source', () => {
    metricsCache.set('us-east', { cpu: 1 });
    metricsCache.set('us-east', { cpu: 2 });
    expect(metricsCache.get('us-east')?.data).toEqual({ cpu: 2 });
  });

  it('reports getAll with count and timestamps', () => {
    metricsCache.set('us-east', { a: 1 });
    metricsCache.set('eu-west', { a: 2 });
    const snap = metricsCache.getAll();
    expect(snap.count).toBe(2);
    expect(snap.data).toEqual({ 'us-east': { a: 1 }, 'eu-west': { a: 2 } });
    expect(snap.updatedAtBySource['us-east']).toBeInstanceOf(Date);
  });

  it('isReady is false until every expected source is populated', () => {
    expect(metricsCache.isReady()).toBe(false);
    const sources = ['us-east', 'eu-west', 'eu-central', 'us-west', 'sa-east'];
    sources.forEach((s) => metricsCache.set(s, {}));
    expect(metricsCache.isReady()).toBe(false); // missing ap-southeast
    metricsCache.set('ap-southeast', {});
    expect(metricsCache.isReady()).toBe(true);
  });

  it('whenReady resolves immediately when already ready', async () => {
    const all = [
      'us-east',
      'eu-west',
      'eu-central',
      'us-west',
      'sa-east',
      'ap-southeast',
    ];
    all.forEach((s) => metricsCache.set(s, {}));
    await expect(metricsCache.whenReady()).resolves.toBeUndefined();
  });

  it('whenReady resolves once the final source arrives', async () => {
    const all = [
      'us-east',
      'eu-west',
      'eu-central',
      'us-west',
      'sa-east',
      'ap-southeast',
    ];
    let resolved = false;
    const p = metricsCache.whenReady().then(() => {
      resolved = true;
    });
    all.slice(0, 5).forEach((s) => metricsCache.set(s, {}));
    // wait a microtask — still not ready
    await Promise.resolve();
    expect(resolved).toBe(false);
    metricsCache.set(all[5], {});
    await p;
    expect(resolved).toBe(true);
  });

  it('clear resets the ready latch so whenReady can fire again', async () => {
    const all = [
      'us-east',
      'eu-west',
      'eu-central',
      'us-west',
      'sa-east',
      'ap-southeast',
    ];
    all.forEach((s) => metricsCache.set(s, {}));
    expect(metricsCache.isReady()).toBe(true);
    metricsCache.clear();
    expect(metricsCache.isReady()).toBe(false);
    let resolved = false;
    const p = metricsCache.whenReady().then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    all.forEach((s) => metricsCache.set(s, {}));
    await p;
    expect(resolved).toBe(true);
  });
});
