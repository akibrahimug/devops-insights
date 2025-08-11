import {
  getIn,
  filterByRange,
  groupBySource,
  sumAcrossAllSources,
  sumPerSource,
  compressByTime,
  compressPerSourceByTime,
  extractSessions,
  extractActiveConnections,
  extractRequestsPerSecond,
  extractCpuLoad,
  extractCpus,
  extractWaitTime,
  extractTimers,
  extractOnline,
  extractMemoryUsage,
  extractDiskUsage,
  computeDashboardTotals,
  HistoryItem,
} from "@/lib/helpers/history";

const items: HistoryItem[] = [
  {
    api: "m",
    source: "us-east-1",
    data: {
      results: {
        stats: {
          session: 2,
          server: {
            cpus: 4,
            wait_time: 10,
            timers: 1,
            active_connections: 5,
            cpu_load: 20,
          },
        },
      },
    },
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    api: "m",
    source: "us-west-2",
    data: {
      results: {
        stats: {
          session: 3,
          server: {
            cpus: 8,
            wait_time: 20,
            timers: 2,
            active_connections: 7,
            cpu_load: 10,
          },
        },
      },
    },
    createdAt: "2025-01-01T00:00:05Z",
  },
];

describe("history core", () => {
  it("getIn reads nested", () => {
    expect(getIn(items[0].data, "results.stats.server.cpus", 0)).toBe(4);
  });
  it("filterByRange keeps window", () => {
    const filtered = filterByRange(items, {
      from: "2025-01-01T00:00:00Z",
      to: "2025-01-01T00:00:03Z",
    });
    expect(filtered.length).toBe(1);
  });
  it("groupBySource splits", () => {
    const m = groupBySource(items);
    expect(m.get("us-east-1")!.length).toBe(1);
  });
});

describe("history aggregations", () => {
  it("sumAcrossAllSources sessions", () => {
    expect(sumAcrossAllSources(items, extractSessions)).toBe(5);
  });
  it("sumPerSource cpu load", () => {
    const m = sumPerSource(items, extractCpuLoad);
    expect(m["us-east-1"]).toBe(20);
  });
  it("compressByTime", () => {
    const series = compressByTime(items, extractActiveConnections, 5000);
    expect(series.length).toBeGreaterThan(0);
  });
  it("compressPerSourceByTime fills gaps", () => {
    const series = compressPerSourceByTime(
      items,
      extractActiveConnections,
      5000,
      {
        from: "2025-01-01T00:00:00Z",
        to: "2025-01-01T00:00:10Z",
      }
    );
    // should include at least start and end bucket
    expect(series["us-east-1"].length).toBeGreaterThanOrEqual(2);
  });
});

describe("extractors", () => {
  it("extracts basics", () => {
    expect(extractSessions(items[0].data)).toBe(2);
    expect(extractActiveConnections(items[0].data)).toBe(5);
    expect(extractRequestsPerSecond(items[0].data)).toBe(0);
    expect(extractCpuLoad(items[0].data)).toBe(20);
    expect(extractCpus(items[0].data)).toBe(4);
    expect(extractWaitTime(items[0].data)).toBe(10);
    expect(extractTimers(items[0].data)).toBe(1);
    expect(extractOnline({ results: { stats: { online: 9 } } })).toBe(9);
  });
  it("memory and disk extract heuristics", () => {
    expect(
      extractMemoryUsage({
        results: { stats: { server: { memory_usage: 12 } } },
      })
    ).toBe(12);
    expect(
      extractDiskUsage({ results: { stats: { server: { disk: 7 } } } })
    ).toBe(7);
  });
});

describe("bundles", () => {
  it("computeDashboardTotals", () => {
    const t = computeDashboardTotals(items);
    expect(t.sessions).toBe(5);
    expect(t.activeConnections).toBe(12);
    expect(t.cpus).toBe(12);
  });
});
